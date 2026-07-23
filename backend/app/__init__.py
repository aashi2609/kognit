# Kognit backend app package

# Centralized .env loading — searches backend/ dir first, then project root
import os
from pathlib import Path
from dotenv import load_dotenv

_backend_dir = Path(__file__).resolve().parent.parent  # backend/
_project_root = _backend_dir.parent                    # kognit/

# Load project root .env first (lower priority), then backend .env (higher priority overrides)
load_dotenv(_project_root / ".env")
load_dotenv(_backend_dir / ".env", override=True)
