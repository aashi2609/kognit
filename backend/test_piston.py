"""Test Wandbox with specific Python 3.12 + try local subprocess fallback."""
import httpx
import json
import subprocess
import sys
import tempfile
import os

# Test 1: Wandbox with cpython-3.12.7
print("=== Wandbox: cpython-3.12.7 ===")
try:
    with httpx.Client(timeout=10.0) as client:
        resp = client.post(
            "https://wandbox.org/api/compile.json",
            json={
                "code": "print('Hello Kognit!')",
                "compiler": "cpython-3.12.7",
            },
        )
        print(f"Status: {resp.status_code}")
        data = resp.json()
        print(f"program_output: {repr(data.get('program_output', ''))}")
        print(f"program_error: {repr(data.get('program_error', ''))}")
        print(f"status: {data.get('status', '')}")
except Exception as e:
    print(f"FAIL: {type(e).__name__}: {e}")

print()

# Test 2: Local subprocess execution (safest fallback)
print("=== Local subprocess (Python) ===")
try:
    result = subprocess.run(
        [sys.executable, "-c", "print('Hello Kognit!')"],
        capture_output=True,
        text=True,
        timeout=10,
    )
    print(f"stdout: {repr(result.stdout)}")
    print(f"stderr: {repr(result.stderr)}")
    print(f"returncode: {result.returncode}")
except Exception as e:
    print(f"FAIL: {type(e).__name__}: {e}")
