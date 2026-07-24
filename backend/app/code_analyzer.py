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

# System prompt that makes the AI behave as a conversational coding tutor
SOCRATIC_SYSTEM_PROMPT = """You are Kognit, an AI coding tutor. You watch a student write code in real time and hold a natural back-and-forth conversation about their code.

Your personality:
- Warm, encouraging, patient — like a friendly senior developer sitting next to them
- Conversational and natural — you are speaking aloud, not writing documentation
- Keep responses SHORT (1-3 sentences max). You will be read via text-to-speech.
- Use plain language, no jargon. No markdown, no bullet points, no code blocks.

You have TWO distinct modes depending on what the student needs:

MODE 1 — FACTUAL QUESTIONS (answer directly and honestly):
When the student asks a yes/no or factual question about their code — like "is there a loop?", "do I have a main function?", "how many variables do I have?" — answer it DIRECTLY and TRUTHFULLY based on what you actually see in the code.
Examples:
- "Is there a loop here?" → "No, there's no loop in your current code. You just have a simple sequence of statements."
- "Do I have a return statement?" → "Yes, you have a return statement on line 7."
- "Why is this wrong?" → "Line 3 is missing a semicolon. Java requires every statement to end with a semicolon."
- "What does this function do?" → "Your function on line 2 takes two integers and adds them together."

MODE 2 — ERROR DISCOVERY (gentle Socratic hints):
When you proactively spot an error and the student hasn't asked about it yet, guide them gently without giving away the fix.
Example: "Take a look at line 5 — something at the end of that statement looks off."

FOLLOW-UP CONVERSATIONS:
- If the student asks "why?", "what do you mean?", "can you explain?", or similar — give MORE detail than your last response.
- Reference the specific element you mentioned before (exact line number, variable name, keyword).
- Never repeat the same hint twice. Always escalate to more specific information.

CRITICAL RULES:
- NEVER say "great question", "interesting", "good thinking" or other empty filler phrases.
- EVERY response must mention something specific from the code: a line number, variable name, keyword, or syntax element.
- Always respond in plain spoken English. No markdown whatsoever.
- If the code looks completely fine AND the student asked no question, respond with exactly: __SILENT__
- LANGUAGE-AWARE: Only flag errors valid for the language being used.
  Python: colons after if/for/def/while, indentation, mismatched brackets — NEVER semicolons.
  Java/C/C++/JavaScript/TypeScript: semicolons, braces, parentheses — NEVER colons after control flow.
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
    
    # Include last 10 messages (5 back-and-forth exchanges) for rich follow-up context
    recent_messages = conversation_history[-10:] if conversation_history else []
    for msg in recent_messages:
        messages.append({"role": msg["role"], "content": msg["content"]})
    
    # Build the current context message with line numbers
    context_parts = []
    
    # Add numbered code for easier line reference
    code_lines = code.split('\n')
    numbered_code = '\n'.join(f"{i+1:3d} | {line}" for i, line in enumerate(code_lines))
    context_parts.append(
        f"The student is writing {language} code. Here is their current code with line numbers:\n"
        f"```\n{numbered_code}\n```"
    )
    
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
    else:
        context_parts.append(
            "The student just updated their code. Scan it for errors or issues. "
            "If the code looks correct and nothing is notably wrong, respond with exactly: __SILENT__"
        )
    
    messages.append({"role": "user", "content": "\n\n".join(context_parts)})
    
    # Route to the available LLM
    response_text = await _call_llm(messages)
    
    # If LLMs are unavailable or quota-exhausted, use smart Socratic fallback
    if not response_text:
        response_text = _heuristic_socratic_fallback(code, language, last_error, user_question)

    if response_text and response_text.strip() == "__SILENT__":
        return None
    
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
    """Call Gemini API using direct httpx REST calls (avoids SDK import issues)."""
    import httpx
    import json

    _ssl_verify = os.getenv("KOGNIT_SSL_VERIFY", "0") not in ("0", "false", "no")

    # Extract system prompt and build Gemini contents list
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
        "generationConfig": {
            "maxOutputTokens": 400,
            "temperature": 0.7,
        },
    }
    if system_instruction:
        request_body["systemInstruction"] = {"parts": [{"text": system_instruction}]}

    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": api_key,
    }

    models_to_try = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-2.0-flash-lite", "gemini-2.0-flash"]

    async with httpx.AsyncClient(verify=_ssl_verify, timeout=20) as client:
        for model_name in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"
            try:
                response = await client.post(url, headers=headers, json=request_body)
                if response.status_code == 200:
                    data = response.json()
                    return data["candidates"][0]["content"]["parts"][0]["text"]
                elif response.status_code == 429:
                    print(f"[KOGNIT] Gemini ({model_name}): quota exhausted, trying next model...")
                    continue
                else:
                    err = response.json().get("error", {}).get("message", "")[:100]
                    print(f"[KOGNIT] Gemini ({model_name}) error {response.status_code}: {err}")
                    continue
            except Exception as e:
                print(f"[KOGNIT] Gemini ({model_name}) exception: {str(e)[:100]}")
                continue

    print("[KOGNIT] All Gemini models exhausted. Using Socratic fallback.")
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
