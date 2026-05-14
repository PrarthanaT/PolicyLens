import aiosqlite
from pathlib import Path
from contextlib import asynccontextmanager

DB_PATH = Path(__file__).resolve().parent.parent / "db" / "policies.db"


@asynccontextmanager
async def get_db():
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        yield db
    finally:
        await db.close()
