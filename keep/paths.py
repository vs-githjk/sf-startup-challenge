"""Resolve configured paths under one fixed root so env or CLI input cannot escape it."""
import os
from pathlib import Path


def root() -> Path:
    return Path(os.environ.get("KEEP_ROOT") or Path.cwd()).resolve()


def confine(raw: str | os.PathLike, base: Path | None = None) -> Path:
    """Return raw resolved inside base (default root()); refuse anything that escapes it."""
    base = (base or root()).resolve()
    path = (base / raw).resolve()
    if not path.is_relative_to(base):
        raise ValueError("path escapes the allowed root")
    return path
