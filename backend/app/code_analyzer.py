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

IMPORTANT RULES:
- Always respond in plain text. No markdown, no code blocks, no bullet points.
- Your response will be spoken aloud via text-to-speech, so write like you're talking.
- If the code looks fine and there's no question, respond with exactly: __SILENT__
- If the student's code has a new error that wasn't there before, respond with a hint.
- If the student fixed an error that was there before, respond with praise.
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
    
    # Add conversation history (last few turns for context)
    for msg in conversation_history[-10:]:
        messages.append({"role": msg["role"], "content": msg["content"]})
    
    # Build the current context message
    context_parts = []
    context_parts.append(f"The student is writing {language} code. Here is their current code:\n```\n{code}\n```")
    
    if last_error:
        context_parts.append(f"Previously detected error: {last_error}")
    
    if user_question:
        context_parts.append(f"The student just asked: \"{user_question}\"")
    else:
        context_parts.append("The student just updated their code. Check if there are new errors, if a previous error was fixed, or if everything looks fine.")
    
    messages.append({"role": "user", "content": "\n\n".join(context_parts)})
    
    # Route to the available LLM
    response_text = await _call_llm(messages)
    
    if response_text and response_text.strip() == "__SILENT__":
        return None
    
    return response_text


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
    
    print("[KOGNIT] ⚠ No LLM available")
    return None


async def _call_gemini(api_key: str, messages: list[dict]) -> str | None:
    """Call Gemini API using the new google-genai SDK with retry on rate limits."""
    import asyncio
    
    # Try multiple models — each has its own separate quota pool
    models_to_try = ["gemini-1.5-flash", "gemini-2.0-flash"]
    
    for model_name in models_to_try:
        for attempt in range(3):  # max 3 retries per model
            try:
                from google import genai
                from google.genai import types
                
                client = genai.Client(api_key=api_key)
                
                # Extract system instruction and build contents
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
                
                response = client.models.generate_content(
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
                if "429" in error_str or "quota" in error_str.lower() or "rate" in error_str.lower():
                    if attempt < 2:
                        wait_time = (attempt + 1) * 15
                        print(f"[KOGNIT] {model_name} rate limited (attempt {attempt+1}), waiting {wait_time}s...")
                        await asyncio.sleep(wait_time)
                        continue
                    else:
                        print(f"[KOGNIT] {model_name} quota exhausted, trying next model...")
                        break
                elif "404" in error_str or "not found" in error_str.lower() or "no longer available" in error_str.lower():
                    print(f"[KOGNIT] {model_name} not available, trying next model...")
                    break
                else:
                    print(f"[KOGNIT] Gemini ({model_name}) error: {e}")
                    break
    
    print("[KOGNIT] ⚠ All Gemini models unavailable. Staying silent.")
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
