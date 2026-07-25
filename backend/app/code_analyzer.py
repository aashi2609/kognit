"""
Kognit Backend — Code Analyzer

LLM-powered code analysis that detects syntax errors, logic errors,
and generates Socratic pedagogical hints. This is the "brain" that
drives proactive AI interventions.
"""

from __future__ import annotations

import os
import time
from dotenv import load_dotenv
from app.database import AsyncSessionLocal
from sqlalchemy import text

load_dotenv()

# ── Circuit breaker ───────────────────────────────────────────────────
# Tracks when ALL Gemini text-analysis models were last found exhausted.
# While time.time() < _gemini_text_exhausted_until, we skip straight to
# the heuristic fallback without firing a single HTTP request.
_gemini_text_exhausted_until: float = 0.0
GEMINI_COOLDOWN_SECS = 120  # 2-minute backoff after full quota exhaustion

# System prompt that makes the AI behave as a conversational coding tutor
SOCRATIC_SYSTEM_PROMPT = """You are Kognit, an AI coding tutor watching a student write code in real time.

CRITICAL DIRECTIVE FOR ALL RESPONSES ABOUT ERRORS:
Whenever there is an error in the student's code (or whenever they ask about errors/issues), you MUST ALWAYS EXPLICITLY STATE BOTH:
1. THE EXACT LINE NUMBER where the issue is located (e.g., "Line 3", "On line 5").
2. THE EXACT ERROR AND EXACT CODE ELEMENT (e.g., "Line 3 is missing a colon at the end of the for statement", "Line 8 has an unclosed parenthesis").

NEVER be vague. NEVER say "something looks off" or "take a look at line 5". ALWAYS name the exact line number and the exact error.

Personality & Format:
- Short, clear, and direct (1-2 sentences max). Spoken aloud via text-to-speech.
- Plain English only in response_text. No markdown, no code blocks, no bullet points.
- NEVER use empty filler like "great question", "good thinking", or "interesting".

LANGUAGE-AWARE RULES:
- Python: colons after control statements (if/for/def/while), indentation, mismatched brackets. NEVER suggest semicolons.
- Java/C/C++/JS/TS: semicolons, braces, parentheses. NEVER suggest colons after control flow.

JSON RESPONSE FORMAT:
Always respond with a single JSON object, nothing else, in this exact shape:
{"response_text": "<your spoken response, following all rules above>", "emotion": "<one of: encouraging, thinking, concerned, celebratory, neutral>"}

Emotion guide:
- "celebratory": the student just resolved a bug or wrote correct code after a struggle
- "encouraging": gently pointing out an issue for the first time, low escalation_level
- "concerned": the student has been stuck on the same issue for multiple turns (high escalation_level)
- "thinking": you are asking a broad, open-ended Socratic question
- "neutral": factual answers, or no notable emotional context

If code has no errors and no question was asked, your response_text inside the JSON must be exactly: __SILENT__
"""


import json

def parse_json_response(raw_text: str) -> tuple[str, str]:
    """Parse JSON response from LLM into (response_text, emotion)."""
    if not raw_text:
        return "", "neutral"
    raw_text = raw_text.strip()
    try:
        # Strip markdown code fences if present (e.g., ```json ... ```)
        if raw_text.startswith("```"):
            lines = raw_text.split('\n')
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            raw_text = '\n'.join(lines).strip()
            
        data = json.loads(raw_text)
        text = str(data.get("response_text", "")).strip()
        emotion = str(data.get("emotion", "neutral")).strip().lower()
        if emotion not in ("encouraging", "thinking", "concerned", "celebratory", "neutral"):
            emotion = "neutral"
        return text, emotion
    except Exception:
        import re
        response_match = re.search(r'"response_text"\s*:\s*"(.*?)"', raw_text, re.DOTALL)
        emotion_match = re.search(r'"emotion"\s*:\s*"(.*?)"', raw_text, re.DOTALL)
        
        text = response_match.group(1) if response_match else raw_text
        emotion = emotion_match.group(1) if emotion_match else "neutral"
        
        if response_match:
            text = text.replace('\\"', '"').replace('\\n', '\n')
            
        emotion = emotion.strip().lower()
        if emotion not in ("encouraging", "thinking", "concerned", "celebratory", "neutral"):
            emotion = "neutral"
        return text.strip(), emotion



async def analyze_code(
    code: str,
    language: str,
    conversation_history: list[dict],
    last_error: str | None = None,
    user_question: str | None = None,
) -> tuple[str | None, str]:
    """
    Analyze code and/or respond to a user question using the configured LLM.
    Returns (response_text, emotion), or (None, emotion) if the AI should stay silent.
    """
    clean_code, exam_question, execution_error, execution_success = extract_and_clean_code(code)

    resolved_this_turn = False
    if last_error:
        has_error = False
        if execution_error:
            has_error = True
        elif language.lower() in ("python", "py"):
            try:
                import ast
                ast.parse(clean_code)
            except Exception:
                has_error = True
        if not has_error:
            resolved_this_turn = True

    if "EXECUTION SUCCESS" in code and not user_question:
        if resolved_this_turn:
            congratulations_msg = f"Awesome work! You fixed the bug and your {language} code executed successfully!"
            return congratulations_msg, "celebratory"
        return None, "neutral"

    # Build the messages for the LLM
    messages = [{"role": "system", "content": SOCRATIC_SYSTEM_PROMPT}]
    
    # Include last 10 messages (5 back-and-forth exchanges) for rich follow-up context
    recent_messages = conversation_history[-10:] if conversation_history else []
    for msg in recent_messages:
        messages.append({"role": msg["role"], "content": msg["content"]})
    
    # Build the current context message with line numbers
    context_parts = []

    if exam_question:
        context_parts.append(
            f"The student is trying to solve the following exam question/prompt:\n"
            f"```\n{exam_question}\n```"
        )

    # Add numbered code for easier line reference
    code_lines = clean_code.split('\n')
    numbered_code = '\n'.join(f"{i+1:3d} | {line}" for i, line in enumerate(code_lines))
    context_parts.append(
        f"The student is writing {language} code. Here is their current code with line numbers:\n"
        f"```\n{numbered_code}\n```"
    )
    
    if execution_error:
        context_parts.append(
            f"The compiler/execution engine returned the following error for this code:\n"
            f"```\n{execution_error}\n```"
        )
    elif execution_success:
        context_parts.append("The compiler/execution engine verified that this code runs successfully without errors.")

    if last_error:
        context_parts.append(f"The last issue you pointed out was: \"{last_error}\"")
    
    # Classify the question type so the AI knows which mode to use
    if user_question:
        q = user_question.lower()
        
        factual_triggers = [
            "is there", "do i have", "do i", "is this", "are there", "does this",
            "how many", "what is", "what's", "where is", "which line", "why is",
            "why does", "what does", "explain", "why", "tell me", "show me",
            "what type", "what kind", "can you see", "do you see", "what's wrong",
            "whats wrong", "what error", "is it", "does it",
        ]
        followup_triggers = [
            "what do you mean", "more detail", "elaborate", "huh",
            "i don't understand", "what exactly", "why exactly", "say that again",
        ]
        
        is_factual = any(kw in q for kw in factual_triggers)
        is_followup = any(kw in q for kw in followup_triggers)
        
        if is_factual:
            context_parts.append(
                f"STUDENT QUESTION: \"{user_question}\"\n"
                f"This is a factual question. Answer it DIRECTLY and HONESTLY based on what you actually see "
                f"in the code above. Do not be evasive or Socratic. If there is no loop, say so. "
                f"If there is a bug, name exactly what and where it is."
            )
        elif is_followup:
            context_parts.append(
                f"STUDENT FOLLOW-UP: \"{user_question}\"\n"
                f"The student wants more detail about what you previously said. Give a more specific explanation — "
                f"name the exact line number, variable, keyword, or language rule involved. "
                f"Do not repeat your previous response verbatim."
            )
        else:
            context_parts.append(
                f"STUDENT SAID: \"{user_question}\"\n"
                f"Respond naturally and helpfully based on their code and what they said."
            )
    if resolved_this_turn:
        context_parts.append(
            "VICTORY MOMENT: The student just successfully resolved the bug in their code! "
            "Congratulate them warmly in 1 short spoken sentence (e.g., 'Great job! You fixed the error and your code looks clean now.')."
        )
    else:
        context_parts.append(
            "The student just updated their code. Scan it for errors or issues. "
            "If the code looks correct and nothing is notably wrong, respond with exactly: __SILENT__"
        )
    
    messages.append({"role": "user", "content": "\n\n".join(context_parts)})
    
    # Route to the available LLM
    response_raw = await _call_llm(messages)
    
    if response_raw:
        response_text, emotion = parse_json_response(response_raw)
    else:
        response_text, emotion = _heuristic_socratic_fallback(code, language, last_error, user_question)

    if resolved_this_turn:
        emotion = "celebratory"

    if response_text and response_text.strip() == "__SILENT__":
        return None, emotion
    
    # Ensure response ends on a complete sentence — never cut off mid-word
    if response_text:
        response_text = response_text.strip()
        if response_text and response_text[-1] not in '.!?':
            last_end = max(
                response_text.rfind('.'),
                response_text.rfind('!'),
                response_text.rfind('?'),
            )
            if last_end > len(response_text) // 2:
                response_text = response_text[:last_end + 1]
    
    return response_text, emotion


import re as _re
_SENTENCE_END = _re.compile(r'(?<=[.!?])\s+')

async def analyze_code_stream(
    code: str,
    language: str,
    conversation_history: list[dict],
    last_error: str | None = None,
    user_question: str | None = None,
    user_id: str | None = None,
):
    """
    Async generator that yields (sentence, emotion) tuples as they arrive.
    """
    clean_code, exam_question, execution_error, execution_success = extract_and_clean_code(code)

    resolved_this_turn = False
    if last_error:
        has_error = False
        if execution_error:
            has_error = True
        elif language.lower() in ("python", "py"):
            try:
                import ast
                ast.parse(clean_code)
            except Exception:
                has_error = True
        if not has_error:
            resolved_this_turn = True

    if "EXECUTION SUCCESS" in code and not user_question:
        if resolved_this_turn:
            congratulations_msg = f"Awesome work! You fixed the bug and your {language} code executed successfully!"
            yield congratulations_msg, "celebratory"
        return

    messages = [{"role": "system", "content": SOCRATIC_SYSTEM_PROMPT}]
    recent_messages = conversation_history[-10:] if conversation_history else []
    for msg in recent_messages:
        messages.append({"role": msg["role"], "content": msg["content"]})

    context_parts = []

    if exam_question:
        context_parts.append(
            f"The student is trying to solve the following exam question/prompt:\n"
            f"```\n{exam_question}\n```"
        )

    code_lines = clean_code.split('\n')
    numbered_code = '\n'.join(f"{i+1:3d} | {line}" for i, line in enumerate(code_lines))
    context_parts.append(
        f"The student is writing {language} code. Here is their current code with line numbers:\n"
        f"```\n{numbered_code}\n```"
    )

    if execution_error:
        context_parts.append(
            f"The compiler/execution engine returned the following error for this code:\n"
            f"```\n{execution_error}\n```"
        )
    elif execution_success:
        context_parts.append("The compiler/execution engine verified that this code runs successfully without errors.")

    if last_error:
        context_parts.append(f"The last issue you pointed out was: \"{last_error}\"")
    if user_question:
        q = user_question.lower()
        factual_triggers = [
            "is there", "do i have", "do i", "is this", "are there", "does this",
            "how many", "what is", "what's", "where is", "which line", "why is",
            "why does", "what does", "explain", "why", "tell me", "show me",
            "what type", "what kind", "can you see", "do you see", "what's wrong",
            "whats wrong", "what error", "is it", "does it",
        ]
        followup_triggers = [
            "what do you mean", "more detail", "elaborate", "huh",
            "i don't understand", "what exactly", "why exactly", "say that again",
        ]
        is_factual = any(kw in q for kw in factual_triggers)
        is_followup = any(kw in q for kw in followup_triggers)
        if is_factual:
            context_parts.append(
                f"STUDENT QUESTION: \"{user_question}\"\n"
                f"Answer DIRECTLY and HONESTLY based on what you actually see in the code."
            )
        elif is_followup:
            context_parts.append(
                f"STUDENT FOLLOW-UP: \"{user_question}\"\n"
                f"Give a more specific explanation — name the exact line, variable, or rule involved."
            )
        else:
            context_parts.append(f"STUDENT SAID: \"{user_question}\"")
    if resolved_this_turn:
        context_parts.append(
            "VICTORY MOMENT: The student just successfully resolved the bug in their code! "
            "Congratulate them warmly in 1 short spoken sentence (e.g., 'Great job! You fixed the error and your code looks clean now.')."
        )
    else:
        context_parts.append(
            "The student just updated their code. Scan it for errors. "
            "If correct, respond with exactly: __SILENT__"
        )
    messages.append({"role": "user", "content": "\n\n".join(context_parts)})

    # Try fetching from Gemini
    gemini_key = os.getenv("GEMINI_API_KEY")
    streamed_any = False

    if gemini_key and time.time() >= _gemini_text_exhausted_until:
        raw_llm_response = await _call_gemini(gemini_key, messages)
        if raw_llm_response:
            streamed_any = True
            response_text, emotion = parse_json_response(raw_llm_response)

            if resolved_this_turn:
                emotion = "celebratory"

            if response_text.strip() == "__SILENT__":
                yield "__SILENT__", emotion
                return

            if user_id:
                if emotion == "celebratory":
                    await update_skill_mastery(user_id, language, True)
                elif emotion in ("concerned", "encouraging"):
                    await update_skill_mastery(user_id, language, False)

            # Split response into sentences
            sentences = _SENTENCE_END.split(response_text)
            for sentence in sentences:
                if sentence.strip():
                    yield sentence.strip(), emotion
                    
        if streamed_any:
            return

    # Heuristic fallback
    fallback_text, emotion = _heuristic_socratic_fallback(code, language, last_error, user_question)
    if resolved_this_turn:
        emotion = "celebratory"

    if fallback_text and fallback_text.strip() != "__SILENT__":
        if user_id:
            if emotion == "celebratory":
                await update_skill_mastery(user_id, language, True)
            elif fallback_text:
                await update_skill_mastery(user_id, language, False)
        yield fallback_text.strip(), emotion


async def _stream_gemini_sentences(api_key: str, messages: list[dict]):
    """
    Inner generator: connects to Gemini SSE, buffers token chunks, and
    yields complete sentences (split on .!? + whitespace) as they form.
    Trips the circuit breaker on full quota exhaustion.
    """
    import httpx

    global _gemini_text_exhausted_until

    _ssl_verify = os.getenv("KOGNIT_SSL_VERIFY", "0") not in ("0", "false", "no")

    system_instruction = ""
    contents = []
    for msg in messages:
        if msg["role"] == "system":
            system_instruction = msg["content"]
        else:
            role = "user" if msg["role"] == "user" else "model"
            contents.append({"role": role, "parts": [{"text": msg["content"]}]})

    request_body = {
        "contents": contents,
        "generationConfig": {"maxOutputTokens": 400, "temperature": 0.7},
    }
    if system_instruction:
        request_body["systemInstruction"] = {"parts": [{"text": system_instruction}]}

    headers = {"Content-Type": "application/json", "x-goog-api-key": api_key}
    models_to_try = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.0-flash-lite"]
    all_quota = True

    async with httpx.AsyncClient(verify=_ssl_verify, timeout=8) as client:
        for model_name in models_to_try:
            url = (
                f"https://generativelanguage.googleapis.com/v1beta/models"
                f"/{model_name}:streamGenerateContent?alt=sse"
            )
            buffer = ""
            got_any = False
            try:
                async with client.stream("POST", url, headers=headers, json=request_body) as resp:
                    if resp.status_code == 429:
                        print(f"[KOGNIT] Gemini stream ({model_name}): quota exhausted")
                        continue
                    if resp.status_code != 200:
                        err_body = await resp.aread()
                        print(f"[KOGNIT] Gemini stream ({model_name}) error {resp.status_code}")
                        all_quota = False
                        continue

                    all_quota = False
                    async for line in resp.aiter_lines():
                        if not line.startswith("data:"):
                            continue
                        raw = line[5:].strip()
                        if raw in ("", "[DONE]"):
                            continue
                        try:
                            chunk = __import__("json").loads(raw)
                            parts = (
                                chunk.get("candidates", [{}])[0]
                                .get("content", {})
                                .get("parts", [])
                            )
                            for p in parts:
                                if "text" in p:
                                    buffer += p["text"]
                                    got_any = True
                        except Exception:
                            continue

                        # Yield each complete sentence as it forms
                        while True:
                            m = _SENTENCE_END.search(buffer)
                            if not m:
                                break
                            sentence = buffer[:m.start() + 1].strip()
                            buffer = buffer[m.end():]
                            if sentence:
                                yield sentence

                # Yield any trailing text that didn't end with punctuation
                remainder = buffer.strip()
                if remainder and got_any:
                    yield remainder
                if got_any:
                    return  # success — stop trying other models

            except Exception as e:
                all_quota = False
                print(f"[KOGNIT] Gemini stream ({model_name}) exception: {str(e)[:100]}")
                continue

    if all_quota:
        _gemini_text_exhausted_until = time.time() + GEMINI_COOLDOWN_SECS
        print(f"[KOGNIT] All Gemini stream models quota-exhausted — circuit breaker open for {GEMINI_COOLDOWN_SECS}s")


# Languages where a missing semicolon is a hard syntax error (not JS/TS — ASI applies).
SEMICOLON_REQUIRED_LANGUAGES = ("c", "c++", "cpp", "h", "hpp", "java", "csharp", "c#", "go", "rust")


def _strip_injected_context(code: str) -> str:
    """Remove comment blocks injected by the frontend for run/compile context."""
    return _re.sub(
        r"/\*\s*(?:RUNTIME ERROR|COMPILE ERROR|EXECUTION SUCCESS|Exam Question)[\s\S]*?\*/",
        "",
        code,
    ).strip()


def extract_and_clean_code(code: str) -> tuple[str, str | None, str | None, bool]:
    exam_question = None
    execution_error = None
    execution_success = False

    # Check for exam question at the start
    exam_match = _re.search(r"/\*\s*Exam Question:\s*(.*?)\s*\*/", code, _re.DOTALL | _re.IGNORECASE)
    if exam_match:
        exam_question = exam_match.group(1).strip()

    # Check for compile/runtime errors
    compile_match = _re.search(r"/\*\s*COMPILE ERROR \(from execution\):\s*(.*?)\s*\*/", code, _re.DOTALL | _re.IGNORECASE)
    if compile_match:
        execution_error = f"COMPILE ERROR:\n{compile_match.group(1).strip()}"
    else:
        runtime_match = _re.search(r"/\*\s*RUNTIME ERROR \(from execution\):\s*(.*?)\s*\*/", code, _re.DOTALL | _re.IGNORECASE)
        if runtime_match:
            execution_error = f"RUNTIME ERROR:\n{runtime_match.group(1).strip()}"

    # Check for execution success
    if "EXECUTION SUCCESS" in code:
        execution_success = True

    # Now clean the code by removing these comment blocks
    clean_code = _re.sub(
        r"/\*\s*(?:RUNTIME ERROR|COMPILE ERROR|EXECUTION SUCCESS|Exam Question)[\s\S]*?\*/",
        "",
        code,
    ).strip()

    return clean_code, exam_question, execution_error, execution_success



def _is_c_family_statement_needing_semicolon(stripped: str) -> bool:
    """Return True when a line looks like a statement that requires a trailing semicolon."""
    if not stripped or len(stripped) <= 5:
        return False
    if stripped.startswith(("#", "//", "/*", "*")):
        return False
    if stripped.endswith((";", "{", "}", ":", "\\")):
        return False
    # Function prototypes/declarations and control-flow headers end with ')'.
    if stripped.endswith(")"):
        return False
    control_prefixes = (
        "if ", "if(", "else", "for ", "for(", "while ", "while(",
        "switch ", "switch(", "case ", "default:", "default ",
        "catch ", "catch(", "try", "do ", "do{",
    )
    for prefix in control_prefixes:
        if stripped.startswith(prefix) or stripped == prefix.rstrip():
            return False
    decl_keywords = (
        "class ", "struct ", "enum ", "namespace ", "typedef ",
        "using ", "import ", "export ", "public:", "private:", "protected:",
        "package ", "@", "interface ", "implements ", "extends ",
    )
    for kw in decl_keywords:
        if stripped.startswith(kw):
            return False
    if _re.search(r"\bmain\s*\(", stripped):
        return False
    return True


def _find_missing_semicolon_line(lines_list: list[str]) -> int | None:
    """Find the most likely line missing a semicolon; prefer the last match."""
    candidates: list[int] = []
    for idx, line in enumerate(lines_list, 1):
        if _is_c_family_statement_needing_semicolon(line.strip()):
            candidates.append(idx)
    return candidates[-1] if candidates else None


def _heuristic_socratic_fallback(
    code: str,
    language: str,
    last_error: str | None = None,
    user_question: str | None = None,
) -> tuple[str | None, str]:
    """
    Fallback Socratic analyzer when LLM API keys are exhausted or unavailable.
    Provides proactive hints and reacts to questions using heuristic static checks across all programming languages.
    Returns (response_text, emotion).
    """
    lang_lower = (language or "").lower()
    is_direct_question = bool(user_question)
    question_lower = (user_question or "").lower()
    clean_code, exam_question, execution_error, execution_success = extract_and_clean_code(code)

    if execution_success:
        emotion = "celebratory" if last_error else "neutral"
        if user_question:
            if "error" in question_lower or "bug" in question_lower or "wrong" in question_lower:
                return f"Your {language} code ran successfully — no errors were found.", emotion
            if "loop" in question_lower:
                if "for" in clean_code or "while" in clean_code:
                    return f"Yes, your {language} code contains a loop.", emotion
                return f"No loops were found in your {language} code.", emotion
        return None, emotion

    if execution_error or (last_error and ("RUNTIME ERROR" in last_error or "COMPILE ERROR" in last_error)):
        target_str = execution_error if execution_error else (last_error or "")
        line_match = _re.search(r'(?:line|at line|:)\s*(\d+)', target_str, _re.IGNORECASE)
        line_no = line_match.group(1) if line_match else None

        error_match = _re.search(r'([A-Za-z0-9_]+Error:\s*[^\n]+)', target_str)
        if not error_match:
            error_match = _re.search(r'([A-Za-z0-9_]+Exception:\s*[^\n]+)', target_str)
        if not error_match:
            error_match = _re.search(
                r"(expected ['\"].*?['\"] before|missing terminating|syntax error[^\n]*)",
                target_str,
                _re.IGNORECASE,
            )

        if error_match:
            error_detail = error_match.group(1).strip()
        else:
            clean_lines = [
                l.strip() for l in target_str.split('\n')
                if l.strip() and "RUNTIME ERROR" not in l and "COMPILE ERROR" not in l
            ]
            error_detail = clean_lines[-1] if clean_lines else "execution failed"

        emotion = "concerned" if last_error else "encouraging"
        if line_no:
            return f"In line number {line_no} there is an error: {error_detail}.", emotion
        return f"There is an execution error: {error_detail}.", emotion

    # Default emotion for new error vs persistent error vs question
    fallback_emotion = "concerned" if last_error else "encouraging"

    # Language-specific concept tagging: allowed errors per language family
    PYTHON_LANGUAGES = ("python", "py")
    C_FAMILY_LANGUAGES = ("c", "c++", "cpp", "h", "hpp", "java", "javascript", "typescript", "js", "ts", "csharp", "c#", "go", "rust")
    
    # Universal bracket & parenthesis balance check for all code files
    lines_list = clean_code.split('\n')
    open_p_total = 0
    close_p_total = 0
    for idx, line_str in enumerate(lines_list, 1):
        op = line_str.count("(")
        cp = line_str.count(")")
        open_p_total += op
        close_p_total += cp
        if cp > op and close_p_total > open_p_total:
            return f"In line number {idx} there is an error: extra closing parenthesis ')'..", fallback_emotion
    if open_p_total > close_p_total:
        for idx in range(len(lines_list), 0, -1):
            if lines_list[idx-1].count("(") > lines_list[idx-1].count(")"):
                return f"In line number {idx} there is an error: unclosed opening parenthesis '('..", fallback_emotion
        return "In line number 1 there is an error: missing closing parenthesis ')'..", fallback_emotion

    if lang_lower not in PYTHON_LANGUAGES:
        open_b_total = 0
        close_b_total = 0
        for idx, line_str in enumerate(lines_list, 1):
            ob = line_str.count("{")
            cb = line_str.count("}")
            open_b_total += ob
            close_b_total += cb
            if cb > ob and close_b_total > open_b_total:
                return f"In line number {idx} there is an error: extra closing curly brace '}}'..", fallback_emotion
        if open_b_total > close_b_total:
            for idx in range(len(lines_list), 0, -1):
                if lines_list[idx-1].count("{") > lines_list[idx-1].count("}"):
                    return f"In line number {idx} there is an error: unclosed opening curly brace '{{'..", fallback_emotion

    # Python-specific static checks (AST parsing + indentation + colon errors)
    if lang_lower in PYTHON_LANGUAGES:
        import ast
        
        # Check for missing colons after control structures
        for idx, line in enumerate(lines_list, 1):
            stripped = line.strip()
            control_keywords = ['if ', 'elif ', 'else', 'for ', 'while ', 'def ', 'class ', 'try', 'except', 'finally', 'with ']
            for keyword in control_keywords:
                if stripped.startswith(keyword) and not stripped.endswith(':') and not stripped.endswith(':\\'):
                    if len(stripped) > len(keyword) + 2 and '#' not in stripped:
                        return f"In line number {idx} there is an error: missing colon (:) at the end of the {keyword.strip()} statement.", fallback_emotion
        
        # Try parsing with AST
        try:
            ast.parse(clean_code)
            if user_question:
                q_emotion = "thinking"
                if "loop" in question_lower:
                    if "for " in clean_code or "while " in clean_code:
                        return "Yes, your Python code contains a loop structure.", q_emotion
                    return "No, there are no for or while loops in your current Python code.", q_emotion
                if "function" in question_lower or "def" in question_lower:
                    if "def " in clean_code:
                        return "Yes, you have defined a function in your Python code.", q_emotion
                    return "No function is currently defined in your Python code.", q_emotion
                if "error" in question_lower or "bug" in question_lower or "wrong" in question_lower or "fix" in question_lower:
                    return "Your Python code syntax looks completely valid and clean!", q_emotion
                return "Your Python code syntax is valid and passes inspection.", q_emotion
            if last_error:
                return "Nice work! That fixed the syntax issue! Your Python logic looks clean now.", "celebratory"
            return None, "neutral"
        except SyntaxError as e:
            line_no = getattr(e, 'lineno', None)
            msg = getattr(e, 'msg', 'syntax issue')
            
            if line_no:
                return f"In line number {line_no} there is an error: {msg}.", fallback_emotion
            return f"There is an error in your Python syntax: {msg}.", fallback_emotion

    elif lang_lower in C_FAMILY_LANGUAGES:
        if lang_lower in SEMICOLON_REQUIRED_LANGUAGES:
            missing_semicolon_line = _find_missing_semicolon_line(lines_list)
            if missing_semicolon_line:
                return (
                    f"In line number {missing_semicolon_line} there is an error: "
                    f"missing semicolon (;) at the end of the statement.",
                    fallback_emotion
                )

        if user_question:
            q_emotion = "thinking"
            if "loop" in question_lower:
                if "for" in clean_code or "while" in clean_code:
                    return f"Yes, your {language} code contains a loop.", q_emotion
                return f"No loops were found in your {language} code.", q_emotion
            if "error" in question_lower or "bug" in question_lower or "wrong" in question_lower:
                return f"Your {language} code syntax looks clean.", q_emotion
            return f"Your {language} code syntax is valid.", q_emotion
            
        if last_error:
            return f"Nice work! That {language} code syntax issue seems to be resolved now.", "celebratory"
        
        if "main" not in clean_code and len(clean_code.strip()) > 30 and lang_lower in ("c", "c++", "cpp", "java"):
            return f"Remember that a {language} program requires a main function or method as its entry point.", fallback_emotion

    if user_question:
        return f"Your {language} code looks structured. Let me know if you have a specific question about your logic!", "thinking"

    if last_error:
        return f"Nice work! Your {language} code looks much better now.", "celebratory"

    return None, "neutral"


async def _call_llm(messages: list[dict]) -> str | None:
    """Call the best available LLM with the given messages. Returns None if unavailable."""
    global _gemini_text_exhausted_until

    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        if time.time() < _gemini_text_exhausted_until:
            remaining = int(_gemini_text_exhausted_until - time.time())
            print(f"[KOGNIT] Gemini text circuit-breaker open — skipping for {remaining}s")
        else:
            result = await _call_gemini(gemini_key, messages)
            if result:
                return result
    
    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key:
        return await _call_openai(openai_key, messages)
    
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    if anthropic_key:
        return await _call_anthropic(anthropic_key, messages)
    
    print("[KOGNIT] No LLM available")
    return None


async def _call_gemini(api_key: str, messages: list[dict]) -> str | None:
    """
    Call Gemini via direct httpx REST streaming.
    Streams the response and reassembles full text from SSE chunks.
    Trips the circuit breaker if every model returns 429.
    """
    import httpx

    global _gemini_text_exhausted_until

    _ssl_verify = os.getenv("KOGNIT_SSL_VERIFY", "0") not in ("0", "false", "no")

    system_instruction = ""
    contents = []
    for msg in messages:
        if msg["role"] == "system":
            system_instruction = msg["content"]
        else:
            role = "user" if msg["role"] == "user" else "model"
            contents.append({"role": role, "parts": [{"text": msg["content"]}]})

    request_body = {
        "contents": contents,
        "generationConfig": {"maxOutputTokens": 400, "temperature": 0.7},
    }
    if system_instruction:
        request_body["systemInstruction"] = {"parts": [{"text": system_instruction}]}

    headers = {"Content-Type": "application/json", "x-goog-api-key": api_key}
    models_to_try = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.0-flash-lite"]
    all_quota = True  # track whether every failure was a quota error

    async with httpx.AsyncClient(verify=_ssl_verify, timeout=8) as client:
        for model_name in models_to_try:
            # Use streamGenerateContent so we can start reading tokens immediately
            url = (
                f"https://generativelanguage.googleapis.com/v1beta/models"
                f"/{model_name}:streamGenerateContent?alt=sse"
            )
            try:
                full_text = ""
                async with client.stream("POST", url, headers=headers, json=request_body) as resp:
                    if resp.status_code == 429:
                        print(f"[KOGNIT] Gemini ({model_name}): quota exhausted, trying next...")
                        continue
                    if resp.status_code != 200:
                        err_body = await resp.aread()
                        try:
                            err_msg = __import__("json").loads(err_body).get("error", {}).get("message", "")[:100]
                        except Exception:
                            err_msg = err_body[:100]
                        print(f"[KOGNIT] Gemini ({model_name}) error {resp.status_code}: {err_msg}")
                        all_quota = False
                        continue

                    all_quota = False  # at least one model responded — not a quota issue
                    async for line in resp.aiter_lines():
                        if not line.startswith("data:"):
                            continue
                        raw = line[5:].strip()
                        if raw in ("", "[DONE]"):
                            continue
                        try:
                            chunk = __import__("json").loads(raw)
                            parts = (
                                chunk.get("candidates", [{}])[0]
                                .get("content", {})
                                .get("parts", [])
                            )
                            for p in parts:
                                if "text" in p:
                                    full_text += p["text"]
                        except Exception:
                            continue

                if full_text:
                    print(f"[KOGNIT] Gemini ({model_name}) streamed {len(full_text)} chars")
                    return full_text

            except Exception as e:
                all_quota = False
                print(f"[KOGNIT] Gemini ({model_name}) exception: {str(e)[:100]}")
                continue

    # If every single attempt was a 429, trip the circuit breaker
    if all_quota:
        _gemini_text_exhausted_until = time.time() + GEMINI_COOLDOWN_SECS
        print(f"[KOGNIT] All Gemini text models quota-exhausted — circuit breaker open for {GEMINI_COOLDOWN_SECS}s")
    else:
        print("[KOGNIT] All Gemini text models exhausted. Using Socratic fallback.")
    return None


async def _call_openai(api_key: str, messages: list[dict]) -> str:
    """Call OpenAI API."""
    try:
        import openai
        client = openai.AsyncOpenAI(api_key=api_key)
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            max_tokens=400,
            temperature=0.7,
        )
        return response.choices[0].message.content or ""
    except Exception as e:
        print(f"[KOGNIT] OpenAI error: {e}")
        return "I'm having a little trouble thinking right now, give me a moment."


async def _call_anthropic(api_key: str, messages: list[dict]) -> str:
    """Call Anthropic API."""
    try:
        import anthropic
        client = anthropic.AsyncAnthropic(api_key=api_key)
        
        # Extract system prompt
        system_msg = ""
        chat_messages = []
        for msg in messages:
            if msg["role"] == "system":
                system_msg = msg["content"]
            else:
                chat_messages.append({"role": msg["role"], "content": msg["content"]})
        
        response = await client.messages.create(
            model="claude-sonnet-4-20250514",
            system=system_msg,
            messages=chat_messages,
            max_tokens=400,
        )
        return response.content[0].text
    except Exception as e:
        print(f"[KOGNIT] Anthropic error: {e}")
        return "I'm having a little trouble thinking right now, give me a moment."


async def update_skill_mastery(user_id: str, concept_tag: str, resolved: bool):
    if not AsyncSessionLocal:
        return
    async with AsyncSessionLocal() as db:
        resolved_inc = 1 if resolved else 0
        xp_gain = 10 if resolved else 0
        mastery_delta = 0.05 if resolved else -0.01
        
        query = text("""
            INSERT INTO skill_mastery (user_id, concept_tag, confusion_count, resolved_count, xp, last_practiced_at)
            VALUES (:user_id, :concept_tag, 1, :resolved_inc, :xp_gain, now())
            ON CONFLICT (user_id, concept_tag)
            DO UPDATE SET
                confusion_count = skill_mastery.confusion_count + 1,
                resolved_count = skill_mastery.resolved_count + :resolved_inc,
                mastery_level = LEAST(1.0, GREATEST(0.0, skill_mastery.mastery_level + :mastery_delta)),
                xp = skill_mastery.xp + :xp_gain,
                last_practiced_at = now()
        """)
        await db.execute(query, {
            "user_id": user_id,
            "concept_tag": concept_tag,
            "resolved_inc": resolved_inc,
            "xp_gain": xp_gain,
            "mastery_delta": mastery_delta
        })
        await db.commit()

