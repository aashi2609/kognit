import httpx
import time
import re
from fastapi import HTTPException
from pydantic import BaseModel

WANDBOX_API_RUNTIMES = "https://wandbox.org/api/list.json"
WANDBOX_API_EXECUTE = "https://wandbox.org/api/compile.json"

# In-memory cache for Wandbox compilers
_runtime_cache = {
    "data": None,
    "timestamp": 0
}
CACHE_TTL = 3600  # 1 hour in seconds

async def get_piston_runtimes():
    """Fetch runtimes from Wandbox with a 1-hour cache and stale fallback."""
    current_time = time.time()
    
    # Return cache if valid
    if _runtime_cache["data"] and (current_time - _runtime_cache["timestamp"] < CACHE_TTL):
        return _runtime_cache["data"]
        
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(WANDBOX_API_RUNTIMES)
            resp.raise_for_status()
            runtimes = resp.json()
            
            # Update cache
            _runtime_cache["data"] = runtimes
            _runtime_cache["timestamp"] = current_time
            return runtimes
    except Exception as e:
        # Fallback to stale data if fetch fails
        if _runtime_cache["data"]:
            print(f"[KOGNIT] WARNING: Wandbox runtimes fetch failed ({e}). Using stale cache.")
            return _runtime_cache["data"]
        # Cold-start failure
        raise HTTPException(status_code=502, detail=f"Failed to fetch compilers: {e}")

async def resolve_runtime(language: str):
    """Map Kognit language to Wandbox compiler name."""
    runtimes = await get_piston_runtimes()
    
    target_lang = language.lower()
    
    # Handle specific Kognit mappings to Wandbox expected language
    mapping = {
        "javascript": "JavaScript",
        "javascript (react)": "JavaScript",
        "typescript": "TypeScript",
        "typescript (react)": "TypeScript",
        "python": "Python",
        "java": "Java",
        "c": "C",
        "c++": "C++",
        "c#": "C#",
        "go": "Go",
        "rust": "Rust",
        "ruby": "Ruby",
        "php": "PHP",
        "swift": "Swift",
        "lua": "Lua",
        "perl": "Perl",
        "r": "R",
        "bash": "Bash",
        "shell": "Bash",
        "scala": "Scala",
        "haskell": "Haskell"
    }
    
    wandbox_lang = mapping.get(target_lang, target_lang.capitalize())
    
    valid_compilers = [c["name"] for c in runtimes if c.get("language") == wandbox_lang]
    if valid_compilers:
        # Basic heuristic to get stable releases
        if target_lang == "python":
            stable = [c for c in valid_compilers if "cpython-3" in c and "-head" not in c]
            return wandbox_lang, stable[0] if stable else valid_compilers[0]
        elif target_lang == "c":
            stable = [c for c in valid_compilers if "gcc-" in c and "-c" in c and "-head" not in c]
            return wandbox_lang, stable[0] if stable else valid_compilers[0]
        elif target_lang == "c++":
            stable = [c for c in valid_compilers if "gcc-" in c and "-c" not in c and "-head" not in c]
            return wandbox_lang, stable[0] if stable else valid_compilers[0]
        else:
            stable = [c for c in valid_compilers if "-head" not in c]
            return wandbox_lang, stable[0] if stable else valid_compilers[0]
            
    raise HTTPException(status_code=400, detail=f"Unsupported language: {language}")

def resolve_filename(language: str, code: str, saved_filename: str) -> str:
    """Resolve the filename based on the language."""
    target_lang = language.lower()
    
    if target_lang == "java":
        match = re.search(r'public\s+class\s+(\w+)', code)
        if match:
            return f"{match.group(1)}.java"
        return "Main.java"
        
    elif target_lang in ["c", "c++", "cpp"]:
        if saved_filename.endswith(('.c', '.cpp', '.cc', '.cxx', '.h', '.hpp')):
            return saved_filename
        return "main.c" if target_lang == "c" else "main.cpp"
        
    return saved_filename or "main"

async def execute_code(language: str, code: str, saved_filename: str, stdin: str = ""):
    wandbox_lang, compiler = await resolve_runtime(language)
    filename = resolve_filename(language, code, saved_filename)
    
    print(f"[KOGNIT] Running code: {compiler} in {filename} ({len(code)} chars)")
    
    # Wandbox enforces the filename 'prog.java'.
    # If the user defines a 'public class MyClass', Java strictly requires the file to be 'MyClass.java' and will fail.
    # To bypass this, we strip the 'public' modifier from the class definition before sending.
    payload_code = code
    if language.lower() == "java":
        payload_code = re.sub(r'public\s+class\s+', 'class ', code)
        
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                WANDBOX_API_EXECUTE,
                json={
                    "code": payload_code,
                    "compiler": compiler,
                    "stdin": stdin,
                    "save": False
                }
            )
            
            if resp.status_code != 200:
                error_text = resp.text[:300]
                print(f"[KOGNIT] Service error: {resp.status_code} — {error_text}")
                raise HTTPException(
                    status_code=502,
                    detail=f"Execution service returned {resp.status_code}: {error_text}",
                )
                
            data = resp.json()
            
            return {
                "run": {
                    "stdout": data.get("program_output", ""),
                    "stderr": data.get("program_error", ""),
                    "code": int(data.get("status", 0)),
                },
                "compile": {
                    "stderr": data.get("compiler_error", ""),
                    "output": data.get("compiler_output", ""),
                },
                "error_type": "infra" if resp.status_code != 200 else ("compile" if data.get("compiler_error") else ("runtime" if data.get("program_error") and int(data.get("status", 0)) != 0 else None))
            }
            
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Code execution timed out (>15s)")
    except HTTPException:
        raise
    except Exception as e:
        print(f"[KOGNIT] Run exception: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail=f"Execution failed: {str(e)}")
