"""
Kognit Backend — Language Detection from Filename Extension

Comprehensive mapping covering 80+ file extensions to human-readable
language names. Falls back to "plaintext" for unknown extensions.
"""

from __future__ import annotations


EXTENSION_MAP: dict[str, str] = {
    # ── Web / JavaScript ─────────────────────────────────────────────
    ".js": "JavaScript",
    ".mjs": "JavaScript",
    ".cjs": "JavaScript",
    ".jsx": "JavaScript (React)",
    ".ts": "TypeScript",
    ".mts": "TypeScript",
    ".cts": "TypeScript",
    ".tsx": "TypeScript (React)",
    ".html": "HTML",
    ".htm": "HTML",
    ".css": "CSS",
    ".scss": "SCSS",
    ".sass": "Sass",
    ".less": "Less",
    ".vue": "Vue",
    ".svelte": "Svelte",
    ".astro": "Astro",

    # ── Python ────────────────────────────────────────────────────────
    ".py": "Python",
    ".pyw": "Python",
    ".pyi": "Python",
    ".ipynb": "Jupyter Notebook",

    # ── JVM ───────────────────────────────────────────────────────────
    ".java": "Java",
    ".kt": "Kotlin",
    ".kts": "Kotlin",
    ".scala": "Scala",
    ".groovy": "Groovy",
    ".clj": "Clojure",
    ".cljs": "ClojureScript",

    # ── C Family ──────────────────────────────────────────────────────
    ".c": "C",
    ".h": "C",
    ".cpp": "C++",
    ".cc": "C++",
    ".cxx": "C++",
    ".hpp": "C++",
    ".hxx": "C++",
    ".cs": "C#",
    ".m": "Objective-C",
    ".mm": "Objective-C++",

    # ── Systems ───────────────────────────────────────────────────────
    ".rs": "Rust",
    ".go": "Go",
    ".zig": "Zig",
    ".nim": "Nim",
    ".v": "V",
    ".d": "D",

    # ── Apple / Mobile ────────────────────────────────────────────────
    ".swift": "Swift",
    ".dart": "Dart",

    # ── Scripting ─────────────────────────────────────────────────────
    ".rb": "Ruby",
    ".php": "PHP",
    ".pl": "Perl",
    ".pm": "Perl",
    ".lua": "Lua",
    ".r": "R",
    ".R": "R",
    ".jl": "Julia",
    ".ex": "Elixir",
    ".exs": "Elixir",
    ".erl": "Erlang",
    ".hs": "Haskell",
    ".ml": "OCaml",
    ".fs": "F#",
    ".fsx": "F#",
    ".lisp": "Lisp",
    ".el": "Emacs Lisp",
    ".rkt": "Racket",
    ".tcl": "Tcl",

    # ── Shell / DevOps ────────────────────────────────────────────────
    ".sh": "Shell",
    ".bash": "Bash",
    ".zsh": "Zsh",
    ".fish": "Fish",
    ".ps1": "PowerShell",
    ".psm1": "PowerShell",
    ".bat": "Batch",
    ".cmd": "Batch",

    # ── Data / Config ─────────────────────────────────────────────────
    ".json": "JSON",
    ".jsonc": "JSON with Comments",
    ".json5": "JSON5",
    ".yaml": "YAML",
    ".yml": "YAML",
    ".toml": "TOML",
    ".xml": "XML",
    ".csv": "CSV",
    ".ini": "INI",
    ".env": "Dotenv",
    ".properties": "Properties",

    # ── Database ──────────────────────────────────────────────────────
    ".sql": "SQL",
    ".prisma": "Prisma",
    ".graphql": "GraphQL",
    ".gql": "GraphQL",

    # ── Documentation ─────────────────────────────────────────────────
    ".md": "Markdown",
    ".mdx": "MDX",
    ".rst": "reStructuredText",
    ".tex": "LaTeX",
    ".txt": "Plain Text",

    # ── Build / Infra ─────────────────────────────────────────────────
    ".dockerfile": "Dockerfile",
    ".tf": "Terraform",
    ".hcl": "HCL",
    ".proto": "Protocol Buffers",
    ".cmake": "CMake",
    ".make": "Makefile",
    ".gradle": "Gradle",

    # ── Assembly / Low-Level ──────────────────────────────────────────
    ".asm": "Assembly",
    ".s": "Assembly",
    ".wasm": "WebAssembly",
    ".wat": "WebAssembly Text",

    # ── Other ─────────────────────────────────────────────────────────
    ".sol": "Solidity",
    ".vy": "Vyper",
    ".move": "Move",
    ".cairo": "Cairo",
    ".typ": "Typst",
    ".lean": "Lean",
    ".agda": "Agda",
    ".coq": "Coq",
    ".f90": "Fortran",
    ".f95": "Fortran",
    ".pas": "Pascal",
    ".vhdl": "VHDL",
    ".vhd": "VHDL",
    ".sv": "SystemVerilog",
    ".svh": "SystemVerilog",
}

# Special filenames (no extension)
FILENAME_MAP: dict[str, str] = {
    "Makefile": "Makefile",
    "Dockerfile": "Dockerfile",
    "Jenkinsfile": "Groovy",
    "Vagrantfile": "Ruby",
    "Gemfile": "Ruby",
    "Rakefile": "Ruby",
    "CMakeLists.txt": "CMake",
    ".gitignore": "Git Config",
    ".dockerignore": "Docker Config",
    ".editorconfig": "EditorConfig",
}


def detect_language(filename: str) -> str:
    """
    Detect programming language from a filename.
    Checks special filenames first, then extension map.
    Returns 'plaintext' if no match is found.
    """
    # Check exact filename matches first
    if filename in FILENAME_MAP:
        return FILENAME_MAP[filename]

    # Check by extension (try longest match first for compound extensions)
    name_lower = filename.lower()
    for ext, lang in sorted(EXTENSION_MAP.items(), key=lambda x: -len(x[0])):
        if name_lower.endswith(ext):
            return lang

    return "plaintext"
