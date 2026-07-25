"""
Fix 4 validation: simulate 10 seconds of continuous code edits followed by a pause,
then count how many Gemini requests were triggered.

Expected: 0 requests during typing, exactly 1 after the final pause.
"""

import asyncio
import sys
import os
import time
from unittest.mock import patch, AsyncMock

sys.path.insert(0, ".")


async def simulate_typing_burst():
    """
    Simulate the exact scenario: continuous edits for 10s, then silence.
    Counts how many times analyze_code is actually called.
    """
    from app.ws_gateway import _handle_code_update, _get_turn_lock, CODE_ANALYSIS_DEBOUNCE

    print("=" * 60)
    print("DEBOUNCE + SINGLE-FLIGHT TEST")
    print(f"Debounce window: {CODE_ANALYSIS_DEBOUNCE}s")
    print("=" * 60)
    print()

    session_id = "test_session_debounce"
    call_count = 0
    call_times = []

    # Patch analyze_code to count invocations without hitting Gemini
    async def mock_analyze(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        call_times.append(time.time())
        print(f"  [MOCK] analyze_code called (call #{call_count})")
        await asyncio.sleep(0.1)  # simulate fast LLM response
        return None  # silent response

    # Minimal WS mock
    class FakeWS:
        async def send_text(self, _): pass

    ws = FakeWS()

    with patch("app.ws_gateway.analyze_code_stream") as mock_stream, \
         patch("app.ws_gateway.stream_tts_to_ws", new_callable=AsyncMock, return_value=False), \
         patch("app.ws_gateway.text_to_speech", new_callable=AsyncMock, return_value=None), \
         patch("app.ws_gateway.update_code_snapshot"), \
         patch("app.ws_gateway.get_session", return_value={"messages": [], "last_error": None, "code_snapshot": "", "language": ""}), \
         patch("app.ws_gateway.add_message"), \
         patch("app.ws_gateway.set_last_error"):

        async def mock_gen(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            call_times.append(time.time())
            print(f"  [MOCK] analyze_code_stream called (call #{call_count})")
            # yield nothing — silent response
            return
            yield  # make it a generator

        mock_stream.side_effect = mock_gen

        start = time.time()
        print("Phase 1: Typing continuously for 4 seconds (one event per 200ms)...")

        # Fire 20 code_update events over 4 seconds (every 200ms)
        typing_code = "def hello():\n    pass"
        for i in range(20):
            event = {"code": typing_code + " " * i, "language": "Python"}
            await _handle_code_update(session_id, ws, event)
            await asyncio.sleep(0.2)

        typing_end = time.time()
        during_typing = call_count
        print(f"  Requests during 4s typing: {during_typing}")
        print()

        print(f"Phase 2: Stopped typing — waiting {CODE_ANALYSIS_DEBOUNCE + 1}s for debounce...")
        await asyncio.sleep(CODE_ANALYSIS_DEBOUNCE + 1.0)

        after_pause = call_count - during_typing
        print(f"  Requests after pause: {after_pause}")
        print()

    print("=" * 60)
    print("RESULTS:")
    print(f"  Requests during 10s typing: {during_typing}  (expected: 0)")
    print(f"  Requests after pause:        {after_pause}  (expected: 1)")
    print()

    if during_typing == 0 and after_pause == 1:
        print("✅ PASS: Debounce working correctly — zero requests during typing, one clean analysis after pause.")
    elif during_typing == 0:
        print(f"⚠️  PARTIAL: No requests during typing (good), but got {after_pause} after pause (expected 1).")
    else:
        print(f"❌ FAIL: Got {during_typing} requests during typing — debounce not working.")
    print("=" * 60)


async def simulate_concurrent_voice_plus_edit():
    """
    Simulate a voice question arriving while a background analysis is in flight.
    The lock should serialise them: background runs first (or gets dropped),
    voice turn runs exactly once.
    """
    from app.ws_gateway import _debounced_analysis, _handle_audio_in, _get_turn_lock, _turn_locks

    print()
    print("=" * 60)
    print("SINGLE-FLIGHT LOCK TEST (edit + voice concurrency)")
    print("=" * 60)
    print()

    session_id = "test_session_lock"
    # Pre-create the lock
    import asyncio as _asyncio
    _turn_locks[session_id] = _asyncio.Lock()

    call_order = []

    class FakeWS:
        async def send_text(self, _): pass

    ws = FakeWS()

    with patch("app.ws_gateway.analyze_code_stream") as mock_stream, \
         patch("app.ws_gateway.stream_tts_to_ws", new_callable=AsyncMock, return_value=False), \
         patch("app.ws_gateway.text_to_speech", new_callable=AsyncMock, return_value=None), \
         patch("app.ws_gateway.transcribe_audio", new_callable=AsyncMock, return_value="what is missing"), \
         patch("app.ws_gateway.update_code_snapshot"), \
         patch("app.ws_gateway.get_session", return_value={"messages": [], "last_error": None, "code_snapshot": "x=1", "language": "Python"}), \
         patch("app.ws_gateway.add_message"), \
         patch("app.ws_gateway.set_last_error"):

        async def slow_gen(*args, user_question=None, **kwargs):
            label = "voice" if user_question else "edit"
            call_order.append(f"start:{label}")
            await asyncio.sleep(0.3)
            call_order.append(f"end:{label}")
            return
            yield

        mock_stream.side_effect = slow_gen

        # Launch edit analysis and voice question simultaneously
        code = "def foo():\n    pass\n"
        edit_task = asyncio.create_task(
            _debounced_analysis(session_id, ws, code, "Python")
        )
        # tiny delay so edit grabs the lock first
        await asyncio.sleep(0.05)

        fake_audio_event = {
            "audio": "dGVzdA==",  # base64 "test"
            "format": "webm"
        }
        voice_task = asyncio.create_task(
            _handle_audio_in(session_id, ws, fake_audio_event)
        )

        await asyncio.gather(edit_task, voice_task)

    print(f"  Call order: {call_order}")
    # edit may be dropped (lock check) or run before voice — either is correct
    voice_calls = [e for e in call_order if "voice" in e]
    edit_calls  = [e for e in call_order if "edit" in e]

    if len(voice_calls) == 2:  # start + end
        print("✅ PASS: Voice question ran exactly once and completed.")
    else:
        print(f"❌ FAIL: Unexpected voice call sequence: {voice_calls}")

    # edit should not overlap voice (no interleaving of start/end)
    interleaved = False
    for i in range(len(call_order) - 1):
        if "start:edit" in call_order[i] and "start:voice" in call_order[i+1]:
            # edit started, voice started before edit ended — overlap!
            if "end:edit" not in call_order[i+1:i+2]:
                interleaved = True
    if not interleaved:
        print("✅ PASS: No overlapping AI turns detected.")
    else:
        print("❌ FAIL: Turns overlapped!")
    print("=" * 60)


async def main():
    await simulate_typing_burst()
    await simulate_concurrent_voice_plus_edit()

if __name__ == "__main__":
    asyncio.run(main())
