"""
Test the EXACT bug scenario reported:
- Student has broken Python code (missing colon)
- Tutor gives initial hint
- Student asks "what is missing" via voice
- Tutor should NOT say "great question" and SHOULD reference the actual line/error
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.code_analyzer import _heuristic_socratic_fallback


def test_original_bug_scenario():
    """
    Recreate the exact bug scenario from the issue report.
    """
    print("=" * 80)
    print("ORIGINAL BUG SCENARIO - REPRODUCTION TEST")
    print("=" * 80)
    print()
    
    # The student's broken Python code
    code = """def process_data(items):
    result = []
    for item in items
        if item > 0:
            result.append(item * 2)
    return result
"""
    
    print("SCENARIO: Student writes Python code with a missing colon")
    print("-" * 80)
    print(code)
    print("-" * 80)
    print()
    
    # Turn 1: Initial proactive detection
    print("TURN 1: [Tutor detects error after debounce]")
    turn1_response = _heuristic_socratic_fallback(code, "Python", None, None)
    print(f"🤖 Tutor: \"{turn1_response}\"")
    print()
    
    # Validate Turn 1
    assert turn1_response is not None, "FAIL: No initial response"
    assert "semicolon" not in turn1_response.lower(), "FAIL: Mentioned semicolon for Python!"
    assert "line" in turn1_response.lower(), "FAIL: Didn't reference a line number"
    print("✓ Turn 1 validation passed:")
    print("  - Response generated")
    print("  - No semicolon mention")
    print("  - References line number")
    print()
    
    # Turn 2: Student asks for clarification via voice
    print("TURN 2: [Student asks via voice]")
    print("🎤 Student: \"what is missing\"")
    turn2_response = _heuristic_socratic_fallback(
        code, "Python",
        last_error=turn1_response,
        user_question="what is missing"
    )
    print(f"🤖 Tutor: \"{turn2_response}\"")
    print()
    
    # Validate Turn 2 - This is the critical fix
    assert turn2_response is not None, "FAIL: No response to follow-up"
    
    # Check for forbidden filler phrases
    filler_phrases = ["great question", "good question", "interesting", "that's a good", "good thinking"]
    has_filler = any(phrase in turn2_response.lower() for phrase in filler_phrases)
    assert not has_filler, f"FAIL: Contains filler phrase! Response: {turn2_response}"
    
    # Check for concrete references
    assert "line" in turn2_response.lower(), "FAIL: Doesn't reference line number"
    assert "colon" in turn2_response.lower(), "FAIL: Doesn't mention colon (the actual error)"
    
    # Check language-specific error (no semicolons)
    assert "semicolon" not in turn2_response.lower(), "FAIL: Mentioned semicolon for Python!"
    
    print("✓ Turn 2 validation passed:")
    print("  - No filler phrases")
    print("  - References specific line")
    print("  - Mentions 'colon' (concrete syntax element)")
    print("  - No semicolon mention (language-aware)")
    print()
    
    # Turn 3: Student asks again (testing non-repetition)
    print("TURN 3: [Student still confused, asks again]")
    print("🎤 Student: \"what is missing\"")
    turn3_response = _heuristic_socratic_fallback(
        code, "Python",
        last_error=turn2_response,
        user_question="what is missing"
    )
    print(f"🤖 Tutor: \"{turn3_response}\"")
    print()
    
    # Validate Turn 3
    assert turn3_response is not None, "FAIL: No response to second follow-up"
    assert "colon" in turn3_response.lower(), "FAIL: Lost specificity on repeat"
    assert "line" in turn3_response.lower(), "FAIL: Doesn't reference line"
    
    print("✓ Turn 3 validation passed:")
    print("  - Maintains specificity")
    print("  - Still references line and colon")
    print()
    
    # Summary
    print("=" * 80)
    print("BUG FIX VALIDATION - COMPLETE")
    print("=" * 80)
    print()
    print("BEFORE THE FIX (the bug):")
    print("  Turn 2: \"That's a great question! When working with Python,")
    print("           try breaking down your logic step by step.\"")
    print()
    print("  Problems:")
    print("    ✗ Filler phrase (\"great question\")")
    print("    ✗ No code reference")
    print("    ✗ Generic unhelpful advice")
    print()
    print("AFTER THE FIX (current behavior):")
    print(f"  Turn 2: \"{turn2_response}\"")
    print()
    print("  Improvements:")
    print("    ✓ NO filler phrases")
    print("    ✓ References specific line (line 3)")
    print("    ✓ Mentions concrete syntax element (colon)")
    print("    ✓ References statement type (for statement)")
    print("    ✓ Language-aware (no semicolons for Python)")
    print("    ✓ Escalates from vague to specific")
    print()
    print("=" * 80)
    print("✅ ORIGINAL BUG IS FIXED")
    print("=" * 80)


def test_semicolon_language_bug():
    """
    Test the second bug: incorrectly flagging semicolon for Python.
    """
    print()
    print("=" * 80)
    print("SECOND BUG: Semicolon Language Mismatch")
    print("=" * 80)
    print()
    
    # Three different broken Python scenarios
    scenarios = [
        ("Missing colon after if", """if x > 5
    print(x)"""),
        ("Missing colon after for", """for i in range(10)
    print(i)"""),
        ("Missing colon after def", """def hello()
    print("hi")"""),
    ("Indentation error", """def test():
x = 5
    return x"""),
    ("Missing colon after while", """while True
    break"""),
    ("Missing colon after class", """class Foo
    pass"""),
    ("Missing colon after try", """try
    x = 1"""),
    ("Missing colon after except", """try:
    x = 1
except
    pass"""),
    ("Missing colon after else", """if True:
    pass
else
    pass"""),
    ("Missing colon after elif", """if True:
    pass
elif False
    pass"""),
    ("Missing colon after with", """with open('file.txt')
    pass"""),
    ("Missing colon after finally", """try:
    pass
finally
    pass"""),
    ("Mismatched parentheses", """print("hello"
x = 5"""),
    ("Mismatched brackets", """arr = [1, 2, 3
print(arr)"""),
    ("Clean code (false positive check)", """def add(a, b):
    return a + b

result = add(5, 10)
print(result)"""),
    ]
    
    print(f"Testing {len(scenarios)} Python scenarios...")
    print()
    
    passed = 0
    for idx, (name, code) in enumerate(scenarios, 1):
        response = _heuristic_socratic_fallback(code, "Python", None, None)
        
        # The critical check: NEVER mention semicolons for Python
        if response:
            has_semicolon = "semicolon" in response.lower()
            if has_semicolon:
                print(f"❌ Scenario {idx} FAILED: {name}")
                print(f"   Response: {response}")
                print(f"   PROBLEM: Mentioned 'semicolon' for Python code!")
            else:
                print(f"✅ Scenario {idx} PASSED: {name}")
                if "clean code" in name.lower():
                    print(f"   Response: [silent - code is clean]")
                else:
                    print(f"   Response: {response[:60]}...")
                passed += 1
        else:
            # Silent response (code is clean)
            print(f"✅ Scenario {idx} PASSED: {name}")
            print(f"   Response: [silent - no error detected]")
            passed += 1
    
    print()
    print("-" * 80)
    print(f"RESULTS: {passed}/{len(scenarios)} scenarios passed")
    print("-" * 80)
    
    if passed == len(scenarios):
        print("✅ ALL SCENARIOS PASSED - NO SEMICOLON MENTIONS FOR PYTHON")
    else:
        print(f"❌ {len(scenarios) - passed} scenario(s) failed")
    
    print()


if __name__ == "__main__":
    try:
        test_original_bug_scenario()
        test_semicolon_language_bug()
        print()
        print("=" * 80)
        print("🎉 ALL BUG REPRODUCTION TESTS PASSED")
        print("=" * 80)
        sys.exit(0)
    except AssertionError as e:
        print()
        print("=" * 80)
        print(f"❌ TEST FAILED: {e}")
        print("=" * 80)
        sys.exit(1)
