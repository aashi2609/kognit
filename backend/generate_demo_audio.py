import os
import json
import ssl
import urllib.request

# Parse .env file manually
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
api_key = None
if os.path.exists(env_path):
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line.startswith("ELEVENLABS_API_KEY="):
                api_key = line.split("=", 1)[1].strip().strip('"').strip("'")

if not api_key:
    api_key = os.getenv("ELEVENLABS_API_KEY")

if not api_key:
    print("Error: ELEVENLABS_API_KEY not found.")
    exit(1)

voice_id = "pNInz6obpgDQGcFmaJgB" # Adam voice
url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"

text = (
    "Meet Prometheus—a Socratic pair-programmer that listens as you code out loud. "
    "When you loop on a bug, our multi-agent pipeline catches your cognitive friction. "
    "Instead of spitting out solutions, it speaks up with precise, Socratic probes to guide your intuition. "
    "Watch your breakthrough pulse through the 3D Synapse in real-time."
)

data = {
    "text": text,
    "model_id": "eleven_turbo_v2_5",
    "voice_settings": {
        "stability": 0.50,
        "similarity_boost": 0.75,
        "style": 0.15
    }
}

json_data = json.dumps(data).encode("utf-8")

headers = {
    "Accept": "audio/mpeg",
    "Content-Type": "application/json",
    "xi-api-key": api_key
}

req = urllib.request.Request(url, data=json_data, headers=headers, method="POST")

context = ssl.create_default_context()
context.check_hostname = False
context.verify_mode = ssl.CERT_NONE

output_dir = os.path.join(os.path.dirname(__file__), "..", "public", "audio")
os.makedirs(output_dir, exist_ok=True)
output_path = os.path.join(output_dir, "prometheus_demo_intro.mp3")

print(f"Generating audio to {output_path}...")
try:
    with urllib.request.urlopen(req, context=context) as response:
        audio_bytes = response.read()
        with open(output_path, "wb") as f:
            f.write(audio_bytes)
        print(f"Successfully generated {output_path} ({len(audio_bytes)} bytes)")
except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}: {e.read().decode('utf-8')}")
except Exception as e:
    print(f"Error: {e}")
