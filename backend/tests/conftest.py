import os
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

IMPORT_DATABASE_PATH = Path(tempfile.gettempdir()) / f"notesheep-test-import-{os.getpid()}.sqlite"
if IMPORT_DATABASE_PATH.exists():
    IMPORT_DATABASE_PATH.unlink()

os.environ.setdefault("NOTESHEEP_DATABASE_PATH", str(IMPORT_DATABASE_PATH))
os.environ.setdefault(
    "NOTESHEEP_NOTES_ROOT",
    str(Path(tempfile.gettempdir()) / f"notesheep-test-notes-{os.getpid()}"),
)
