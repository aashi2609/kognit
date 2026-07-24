"""
Kognit Backend — Code Analyzer

LLM-powered code analysis that detects syntax errors, logic errors,
and generates Socratic pedagogical hints. This is the "brain" that
drives proactive AI interventions.
"""

from __future__ import annotations

import os
import json
from dotenv import load_dotenv

load_dotenv()

# System prompt that makes the AI behave as a Socratic tutor
SOCRATIC_SYSTEM_PROMPT = """You are Kognit, a Socratic coding tutor. You watch a student write code in real time.

Your personality:
- Warm, encouraging, patient — like a friendly teaching assistant
- You NEVER give the answer directly. Instead, guide the student with hints and questions.
- Keep responses SHORT (1-3 sentences max). You are speaking aloud, not writing an essay.
- Use natural conversational language, not formal technical jargon.

Your job:
1. PROACTIVE HINTS: When you detect an error, gently point it out without revealing the fix.
   Example: "Hmm, I notice something on line 5 — take a closer look at the semicolon there."
2. ANSWERING QUESTIONS: When the student asks you something, give a helpful but guiding response.
   Example: "Great question! A for-loop would work here too. Think about what your loop variable should start at."
3. MASTERY CONFIRMATION: When a previously broken piece of code is now correct, celebrate briefly.
   Example: "Nice, that fixed it! Your logic looks solid now."

CRITICAL RULES - EVERY RESPONSE MUST FOLLOW THESE:
- NEVER use filler acknowledgment phrases like "great question", "interesting", "good thinking", "that's a good point", or similar generic responses.
- EVERY response must reference something concrete from the actual code (a line number, variable name, syntax element) or what the student just said.
- If you cannot reference something specific, your response is invalid — rewrite it with concrete details.
- When the student asks a direct clarifying question like "what is missing" or "where is the error", give a MORE specific response than your initial hint. Point to the exact line or syntax element.
- Always respond in plain text. No markdown, no code blocks, no bullet points.
- Your response will be spoken aloud via text-to-speech, so write like you're talking.
- If the code looks fine and there's no question, respond with exactly: __SILENT__
- LANGUAGE-AWARE ERROR DETECTION: Only suggest errors that are valid for the programming language being used:
  * Python: missing colons after if/for/def/while, indentation errors, mismatched parentheses/brackets, undefined variables
  * JavaScript/TypeScript/Java/C/C++: missing semicolons, missing braces, mismatched parentheses, undefined variables
  * NEVER suggest semicolon errors for Python code
  * NEVER suggest colon errors for C/Java/JavaScript code
"""


async def analyze_code(
    code: str,
    language: str,
    conversation_history: list[dict],
    last_error: str | None = None,
    user_question: str | None = None,
) -> str | None:
    """
    Analyze code and/or respond to a user question using the configured LLM.
    Returns the AI's spoken response, or None if the AI should stay silent.
    """
    # Build the messages for the LLM
    messages = [{"role": "system", "content": SOCRATIC_SYSTEM_PROMPT}]
    
    # Add conversation history (last 3 turns for immediate context)
    # Include last 6 messages (3 back-and-forth exchanges)
    recent_messages = conversation_history[-6:] if len(conversation_history) > 0 else []
    for msg in recent_messages:
        messages.append({"role": msg["role"], "content": msg["content"]})
    
    # Build the current context message with line numbers
    context_parts = []
    
    # Add numbered code for easier line reference
    code_lines = code.split('\n')
    numbered_code = '\n'.join(f"{i+1:3d} | {line}" for i, line in enumerate(code_lines))
    context_parts.append(f"The student is writing {language} code. Here is their current code with line numbers:\n```\n{numbered_code}\n```")
    
    if last_error:
        context_parts.append(f"Previously detected error: {last_error}")
    
    # Detect direct clarifying questions (escalation signals)
    is_direct_question = False
    if user_question:
        question_lower = user_question.lower()
        clarifying_keywords = ["what is", "where is", "which", "what's", "where's", "show me", "tell me", "what line", "where"]
        if any(keyword in question_lower for keyword in clarifying_keywords):
            is_direct_question = True
        
        if is_direct_question:
            context_parts.append(f"IMPORTANT: The student is asking a DIRECT clarifying question: \"{user_question}\"")
            context_parts.append("This is an escalation signal. Give a MORE SPECIFIC response than before. Reference the exact line number or syntax element. Do not repeat your previous hint.")
        else:
            context_parts.append(f"The student just said: \"{user_question}\"")
    else:
        context_parts.append("The student just updated their code. Check if there are new errors, if a previous error was fixed, or if everything looks fine.")
    
    # Build conversation recap for context
    if len(recent_messages) >= 2:
        last_exchange = []
        for msg in recent_messages[-2:]:
            role_label = "Student" if msg["role"] == "user" else "You"
            last_exchange.append(f"{role_label}: {msg['content']}")
        context_parts.append(f"Recent conversation:\n" + "\n".join(last_exchange))
    
    messages.append({"role": "user", "content": "\n\n".join(context_parts)})
    
    # Route to the available LLM
    response_text = await _call_llm(messages)
    
    # If LLMs are unavailable or quota-exhausted (e.g. 429), use smart Socratic fallback
    if not response_text:
        response_text = _heuristic_socratic_fallback(code, language, last_error, user_question)

    if response_text and response_text.strip() == "__SILENT__":
        return None
    
    return response_text


def _heuristic_socratic_fallback(
    code: str,
    language: str,
    last_error: str | None = None,
    user_question: str | None = None,
) -> str | None:
    """
    Fallback Socratic analyzer when LLM API keys are exhausted or unavailable.
    Provides proactive hints and reacts to questions using heuristic static checks across all programming languages.
    Uses language-aware concept tagging to avoid suggesting invalid errors (e.g., semicolons in Python).
    """
    lang_lower = (language or "").lower()
    
    # Detect direct clarifying questions for escalation
    is_direct_question = False
    if user_question:
        question_lower = user_question.lower()
        clarifying_keywords = ["what is", "where is", "which", "what's", "where's", "show me", "tell me", "what line", "where"]
        is_direct_question = any(keyword in question_lower for keyword in clarifying_keywords)
    
    if user_question and not is_direct_question:
        return f"When working with {language}, try breaking down your logic step by step to test your hypothesis."
    
    if "RUNTIME ERROR" in code:
        return f"I noticed an execution error in your {language} code. Take a close look at your variable names, types, and includes."

    # Language-specific concept tagging: allowed errors per language family
    PYTHON_LANGUAGES = ("python", "py")
    C_FAMILY_LANGUAGES = ("c", "c++", "cpp", "h", "hpp", "java", "javascript", "typescript", "js", "ts", "csharp", "c#", "go", "rust")
    
    # Universal bracket & parenthesis balance check for all code files
    open_braces = code.count("{")
    close_braces = code.count("}")
    if open_braces > close_braces and lang_lower not in PYTHON_LANGUAGES:
        return f"Take a look at your curly braces in {language}. You have an unclosed opening brace on one of your lines."
    elif close_braces > open_braces and lang_lower not in PYTHON_LANGUAGES:
        return f"Check your braces in {language}. You have an extra closing curly brace somewhere."

    open_parens = code.count("(")
    close_parens = code.count(")")
    if open_parens > close_parens:
        return f"Check your parentheses in {language}. You are missing a closing parenthesis somewhere in your code."
    elif close_parens > open_parens:
        return f"Check your parentheses in {language}. You have an extra closing parenthesis."

    # Python-specific static checks (AST parsing + indentation + colon errors)
    if lang_lower in PYTHON_LANGUAGES:
        import ast
        
        # Check for missing colons after control structures
        lines = code.split('\n')
        for idx, line in enumerate(lines, 1):
            stripped = line.strip()
            # Check if line starts with control keyword but doesn't end with colon
            control_keywords = ['if ', 'elif ', 'else', 'for ', 'while ', 'def ', 'class ', 'try', 'except', 'finally', 'with ']
            for keyword in control_keywords:
                if stripped.startswith(keyword) and not stripped.endswith(':') and not stripped.endswith(':\\'):
                    # Avoid false positives on comments or incomplete lines
                    if len(stripped) > len(keyword) + 2 and '#' not in stripped:
                        if is_direct_question:
                            return f"Look at line {idx}. You're missing a colon at the end of that {keyword.strip()} statement."
                        return f"Take a close look at line {idx}. Something is missing at the end of that line."
        
        # Try parsing with AST
        try:
            ast.parse(code)
            if last_error:
                return "Nice, that fixed the syntax issue! Your Python logic looks clean now."
            return None
        except SyntaxError as e:
            line_no = getattr(e, 'lineno', None)
            msg = getattr(e, 'msg', 'syntax issue')
            
            # Provide more specific guidance for common Python errors
            if 'invalid syntax' in msg.lower():
                if line_no:
                    if is_direct_question:
                        return f"Line {line_no} has a syntax error. Check if you're missing a colon, have incorrect indentation, or mismatched brackets."
                    return f"Take a close look near line {line_no}. There's something off with the syntax there."
                return "I noticed a syntax issue with your Python code. Check your colons, indentation, and brackets."
            
            if 'expected an indented block' in msg.lower() or 'indent' in msg.lower():
                return f"Python is very particular about indentation. Check the spacing at the beginning of your lines around line {line_no or 'the error'}."
            
            if line_no:
                if is_direct_question:
                    return f"Look at line {line_no}. There's a {msg} there."
                return f"Take a close look near line {line_no}. It looks like there is a {msg}."
            return "I noticed a syntax issue with your Python code. Check your colons and indentation."

    # C / C++ / Java / JavaScript / TypeScript specific static checks
    # ONLY suggest semicolons for languages that actually require them
    elif lang_lower in C_FAMILY_LANGUAGES:
        lines = [line.strip() for line in code.split("\n") if line.strip()]
        for idx, line in enumerate(lines, 1):
            # Check for missing semicolons in C-family languages
            if (not line.startswith("#") and 
                not line.startswith("//") and 
                not line.startswith("/*") and 
                not line.endswith("*/") and 
                not line.endswith("{") and 
                not line.endswith("}") and 
                not line.endswith(";") and
                "main" not in line and
                "struct" not in line and
                "class" not in line and
                "if" not in line and
                "for" not in line and
                "while" not in line and
                len(line) > 5):
                if is_direct_question:
                    return f"Look at line {idx}. You're missing a semicolon at the end of that statement."
                return f"Take a close look near line {idx}. It looks like you might be missing something at the end of that statement."
        
        if last_error:
            return f"Nice work! That {language} code syntax issue seems to be resolved now."
        
        if "main" not in code and len(code.strip()) > 30 and lang_lower in ("c", "c++", "cpp", "java"):
            return f"Remember that a {language} program requires a main function or method as its entry point."

    # Generic fallback if last error was present
    if last_error:
        return f"Nice work! Your {language} code looks much better now."

    return None


async def _call_llm(messages: list[dict]) -> str | None:
    """Call the best available LLM with the given messages. Returns None if unavailable."""
    
    # Prefer Gemini (it's fast and always configured)
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
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
    """Call Gemini API using the google-genai SDK with fast fallback on quota exhaustion."""
    import httpx

    # On some corporate networks (e.g. Zscaler), SSL inspection replaces certificates
    # with a company-signed cert that Python's bundled CA store doesn't trust.
    # We disable SSL verification here since the API key provides authentication.
    _ssl_verify = os.getenv("KOGNIT_SSL_VERIFY", "0") not in ("0", "false", "no")

    models_to_try = ["gemini-2.0-flash", "gemini-1.5-flash"]
    
    for model_name in models_to_try:
        try:
            from google import genai
            from google.genai import types

            async_client = httpx.AsyncClient(verify=_ssl_verify)
            client = genai.Client(
                api_key=api_key,
                http_options=types.HttpOptions(httpx_async_client=async_client),
            )
            
            system_instruction = ""
            contents = []
            for msg in messages:
                if msg["role"] == "system":
                    system_instruction = msg["content"]
                else:
                    role = "user" if msg["role"] == "user" else "model"
                    contents.append(
                        types.Content(
                            role=role,
                            parts=[types.Part.from_text(text=msg["content"])]
                        )
                    )
            
            response = await client.aio.models.generate_content(
                model=model_name,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    max_output_tokens=200,
                    temperature=0.7,
                )
            )
            return response.text
        except Exception as e:
            error_str = str(e)
            print(f"[KOGNIT] Gemini ({model_name}) limit/error: {error_str[:120]}...")
            continue
    
    print("[KOGNIT] Gemini unavailable (quota/key issue). Using Socratic fallback.")
    return None


async def _call_openai(api_key: str, messages: list[dict]) -> str:
    """Call OpenAI API."""
    try:
        import openai
        client = openai.AsyncOpenAI(api_key=api_key)
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            max_tokens=200,
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
            max_tokens=200,
        )
        return response.content[0].text
    except Exception as e:
        print(f"[KOGNIT] Anthropic error: {e}")
        return "I'm having a little trouble thinking right now, give me a moment."
