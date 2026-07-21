"""
Kognit Backend — Multi-LLM Router

Routes prompts to Gemini, OpenAI, or Anthropic based on model name.
Only exposes models whose API keys are present in .env.
"""

from __future__ import annotations

import os
from dotenv import load_dotenv

load_dotenv()


def get_available_models() -> list[str]:
    """
    Returns a list of model names that are actually usable
    based on which API keys are present in the environment.
    Gemini is always available if GEMINI_API_KEY is set.
    """
    models: list[str] = []

    if os.getenv("GEMINI_API_KEY"):
        models.append("gemini-2.0-flash")

    if os.getenv("OPENAI_API_KEY"):
        models.append("gpt-4o")

    if os.getenv("ANTHROPIC_API_KEY"):
        models.append("claude-sonnet-4")

    return models


def call_llm(model_name: str, prompt: str) -> str:
    """
    Route a prompt to the correct LLM provider based on the model name prefix.
    Raises ValueError if the model is unknown or its API key is missing.
    """
    if model_name.startswith("gemini"):
        import google.generativeai as genai

        key = os.getenv("GEMINI_API_KEY")
        if not key:
            raise ValueError("Gemini not configured — no GEMINI_API_KEY set")
        genai.configure(api_key=key)
        model = genai.GenerativeModel(model_name)
        response = model.generate_content(prompt)
        return response.text

    elif model_name.startswith("gpt"):
        import openai

        key = os.getenv("OPENAI_API_KEY")
        if not key:
            raise ValueError("OpenAI not configured — no OPENAI_API_KEY set")
        client = openai.OpenAI(api_key=key)
        response = client.chat.completions.create(
            model=model_name,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.choices[0].message.content or ""

    elif model_name.startswith("claude"):
        import anthropic

        key = os.getenv("ANTHROPIC_API_KEY")
        if not key:
            raise ValueError("Claude not configured — no ANTHROPIC_API_KEY set")
        client = anthropic.Anthropic(api_key=key)
        response = client.messages.create(
            model=model_name,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text

    else:
        raise ValueError(f"Unknown model: {model_name}")
