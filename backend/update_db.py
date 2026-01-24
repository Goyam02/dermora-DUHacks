import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("DATABASE_URL not found!")
    exit(1)

async def update_schema():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        print("Adding phone_number column...")
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number TEXT UNIQUE;"))
            print("phone_number added.")
        except Exception as e:
            print(f"Error adding phone_number: {e}")

        print("Altering email column...")
        try:
            await conn.execute(text("ALTER TABLE users ALTER COLUMN email DROP NOT NULL;"))
            print("email made nullable.")
        except Exception as e:
            print(f"Error altering email: {e}")

        print("Altering google_sub column...")
        try:
            await conn.execute(text("ALTER TABLE users ALTER COLUMN google_sub DROP NOT NULL;"))
            print("google_sub made nullable.")
        except Exception as e:
            print(f"Error altering google_sub: {e}")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(update_schema())
