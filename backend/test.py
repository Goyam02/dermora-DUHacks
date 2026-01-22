import asyncio
import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

print(f"Testing connection to: {DATABASE_URL}")

if not DATABASE_URL:
    print("❌ DATABASE_URL not found!")
    exit(1)

if "asyncpg" not in DATABASE_URL:
    print("⚠️  WARNING: URL should contain 'asyncpg' for async driver")
    print("   Change postgresql:// to postgresql+asyncpg://")
    exit(1)

engine = create_async_engine(
    DATABASE_URL,
    echo=True,
    pool_pre_ping=True,
)

async def test_connection():
    try:
        print("\n🔄 Attempting connection...\n")
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT version()"))
            version = result.scalar()
            print(f"\n✅ SUCCESS! Connected to PostgreSQL")
            print(f"📊 Version: {version}\n")
    except Exception as e:
        print(f"\n❌ CONNECTION FAILED")
        print(f"Error type: {type(e).__name__}")
        print(f"Error: {e}\n")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_connection())