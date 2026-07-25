import asyncio
from app.database import engine
from app.models import Base, File, SkillMastery, ArenaSession

async def main():
    async with engine.begin() as conn:
        print("Dropping all tables...")
        await conn.run_sync(Base.metadata.drop_all)
        print("Creating all tables...")
        await conn.run_sync(Base.metadata.create_all)
    print("Database cleaned up and schema updated.")

if __name__ == "__main__":
    asyncio.run(main())
