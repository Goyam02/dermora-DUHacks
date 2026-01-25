"""
Comprehensive API Test Suite for Dermora Backend
Tests all endpoints including authenticated routes.

Directory Structure:
    backend/
    ├── app/
    │   ├── main.py
    │   ├── routes/
    │   └── ...
    └── test_api.py  <-- This file

Setup & Run:
    cd backend
    pip install pytest pytest-asyncio httpx pillow
    pytest test_api.py -v

Usage:
    pytest test_api.py -v                    # All tests
    pytest test_api.py -v -k "mood"          # Only mood tests
    pytest test_api.py -v -s                 # Show prints
    pytest test_api.py::test_get_mood_questions -v  # Single test
"""

import pytest
import uuid
from datetime import datetime, date, timedelta
from io import BytesIO
from PIL import Image

# Test using actual running server or mock
TEST_BASE_URL = "http://localhost:8000"

# For testing with actual server running
import httpx

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def create_test_image(width=100, height=100, color=(255, 0, 0)):
    """Create a test PIL image."""
    img = Image.new('RGB', (width, height), color)
    return img


def image_to_bytes(img: Image.Image, format='JPEG'):
    """Convert PIL image to bytes."""
    img_bytes = BytesIO()
    img.save(img_bytes, format=format)
    img_bytes.seek(0)
    return img_bytes


def create_test_audio():
    """Create a dummy WAV file for testing."""
    # Simple WAV header (44 bytes) + minimal audio data
    wav_header = b'RIFF' + b'\x00' * 4 + b'WAVE' + b'fmt ' + b'\x10\x00\x00\x00'
    wav_header += b'\x01\x00\x01\x00\x44\xac\x00\x00\x88\x58\x01\x00\x02\x00\x10\x00'
    wav_header += b'data' + b'\x00' * 4
    audio_data = b'\x00' * 1000
    return BytesIO(wav_header + audio_data)


# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture(scope="session")
def base_url():
    """Base URL for API."""
    return TEST_BASE_URL


@pytest.fixture
async def client():
    """Create async HTTP client."""
    async with httpx.AsyncClient(base_url=TEST_BASE_URL, timeout=10.0) as client:
        yield client


@pytest.fixture
async def test_user_and_headers(client: httpx.AsyncClient):
    """
    Create a test user by syncing with Clerk (or use existing).
    Returns tuple of (user_data, auth_headers).
    
    NOTE: This requires your backend to be running!
    Start with: uvicorn app.main:app --reload
    """
    # Mock Clerk token - your backend should handle test tokens
    # Or you can use a real Clerk test token
    
    try:
        response = await client.post(
            "/auth/sync-user",
            headers={"Authorization": "Bearer test_token_12345"}
        )
        
        if response.status_code != 200:
            pytest.skip("Backend not running or auth failed. Start with: uvicorn app.main:app --reload")
        
        user_data = response.json()
        auth_headers = {
            "X-User-Id": user_data["uuid"],
            "Authorization": "Bearer test_token_12345"
        }
        
        return user_data, auth_headers
        
    except httpx.ConnectError:
        pytest.skip("Backend not running. Start with: uvicorn app.main:app --reload")


# ============================================================================
# PUBLIC ENDPOINT TESTS (No Auth Required)
# ============================================================================

@pytest.mark.asyncio
async def test_get_mood_questions(client: httpx.AsyncClient):
    """Test getting mood questions (public endpoint)."""
    response = await client.get("/mood/questions")
    
    assert response.status_code == 200
    data = response.json()
    assert "questions" in data
    assert len(data["questions"]) == 4
    assert data["questions"][0]["id"] == "mood"
    print(f"✅ Mood questions: {len(data['questions'])} questions retrieved")


@pytest.mark.asyncio
async def test_voice_prompt_preview(client: httpx.AsyncClient):
    """Test voice prompt preview (public endpoint)."""
    response = await client.get("/voice/prompt-preview/75")
    
    assert response.status_code == 200
    data = response.json()
    assert data["mood_score"] == 75
    assert "mood_category" in data
    assert "system_prompt" in data
    print(f"✅ Prompt preview for score 75: {data['mood_category']}")


@pytest.mark.asyncio
async def test_voice_mood_categories(client: httpx.AsyncClient):
    """Test getting voice mood categories (public endpoint)."""
    response = await client.get("/voice/mood-categories")
    
    assert response.status_code == 200
    data = response.json()
    assert "categories" in data
    assert len(data["categories"]) == 6
    print(f"✅ Mood categories: {len(data['categories'])} categories")


# ============================================================================
# AUTH TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_sync_user(client: httpx.AsyncClient):
    """Test user sync from Clerk."""
    response = await client.post(
        "/auth/sync-user",
        headers={"Authorization": "Bearer test_token_12345"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "uuid" in data
    assert "clerk_user_id" in data
    print(f"✅ User synced: UUID {data['uuid'][:8]}...")


# ============================================================================
# AUTHENTICATED SKIN TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_upload_skin_image(client: httpx.AsyncClient, test_user_and_headers):
    """Test uploading a skin image."""
    user_data, auth_headers = test_user_and_headers
    
    img = create_test_image()
    img_bytes = image_to_bytes(img)
    
    files = {
        'file': ('test_skin.jpg', img_bytes, 'image/jpeg')
    }
    
    response = await client.post(
        "/skin/upload",
        headers=auth_headers,
        files=files,
        params={"image_type": "weekly"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "image_id" in data
    assert "prediction" in data
    assert "confidence" in data
    print(f"✅ Image uploaded: {data['prediction']} ({data['confidence']:.2%})")
    
    return data  # Return for use in other tests


@pytest.mark.asyncio
async def test_get_my_images(client: httpx.AsyncClient, test_user_and_headers):
    """Test retrieving user's images."""
    user_data, auth_headers = test_user_and_headers
    
    response = await client.get(
        "/skin/my-images",
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    print(f"✅ Retrieved {len(data)} images")


@pytest.mark.asyncio
async def test_get_improvement_tracker(client: httpx.AsyncClient, test_user_and_headers):
    """Test improvement tracker."""
    user_data, auth_headers = test_user_and_headers
    
    response = await client.get(
        "/skin/improvement-tracker",
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "total_images" in data
    assert "overall_trend" in data
    print(f"✅ Improvement tracker: {data['total_images']} images, trend: {data['overall_trend']}")


# ============================================================================
# AUTHENTICATED MOOD TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_log_mood(client: httpx.AsyncClient, test_user_and_headers):
    """Test logging mood."""
    user_data, auth_headers = test_user_and_headers
    
    mood_data = {
        "mood_score": 75,
        "stress": 30,
        "anxiety": 25,
        "energy": 80,
        "logged_at": datetime.utcnow().isoformat()
    }
    
    response = await client.post(
        "/mood/log",
        headers=auth_headers,
        json=mood_data
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "mood_log_id" in data
    print(f"✅ Mood logged: score={mood_data['mood_score']}")


@pytest.mark.asyncio
async def test_get_mood_history(client: httpx.AsyncClient, test_user_and_headers):
    """Test getting mood history."""
    user_data, auth_headers = test_user_and_headers
    
    response = await client.get(
        "/mood/history",
        headers=auth_headers,
        params={"limit": 10}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "total_logs" in data
    assert "logs" in data
    print(f"✅ Mood history: {data['total_logs']} logs")


# ============================================================================
# AUTHENTICATED VOICE TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_get_voice_prompt(client: httpx.AsyncClient, test_user_and_headers):
    """Test getting personalized voice prompt."""
    user_data, auth_headers = test_user_and_headers
    
    response = await client.get(
        "/voice/prompt",
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "mood_category" in data
    assert "system_prompt" in data
    assert "suggested_duration" in data
    print(f"✅ Voice prompt: {data['mood_category']} - {data['suggested_duration']}")


# ============================================================================
# AUTHENTICATED REPORTS TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_list_weekly_reports(client: httpx.AsyncClient, test_user_and_headers):
    """Test listing weekly reports."""
    user_data, auth_headers = test_user_and_headers
    
    response = await client.get(
        "/reports/weekly/list",
        headers=auth_headers,
        params={"limit": 5}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "total_reports" in data
    assert "reports" in data
    print(f"✅ Weekly reports: {data['total_reports']} reports")


# ============================================================================
# AUTHENTICATED ENGAGEMENT TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_get_streak(client: httpx.AsyncClient, test_user_and_headers):
    """Test getting user streak."""
    user_data, auth_headers = test_user_and_headers
    
    response = await client.get(
        "/engagement/streak",
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "current_streak" in data
    assert "longest_streak" in data
    print(f"✅ Streak: {data['current_streak']} days (best: {data['longest_streak']})")


@pytest.mark.asyncio
async def test_daily_check_in(client: httpx.AsyncClient, test_user_and_headers):
    """Test daily check-in."""
    user_data, auth_headers = test_user_and_headers
    
    response = await client.post(
        "/engagement/check-in",
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "current_streak" in data
    print(f"✅ Check-in: {data['message']}")


@pytest.mark.asyncio
async def test_get_dashboard(client: httpx.AsyncClient, test_user_and_headers):
    """Test getting dashboard data."""
    user_data, auth_headers = test_user_and_headers
    
    response = await client.get(
        "/engagement/dashboard",
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "streak" in data
    assert "quick_stats" in data
    print(f"✅ Dashboard: {data['streak']['current_streak']} day streak")


@pytest.mark.asyncio
async def test_get_daily_insight(client: httpx.AsyncClient, test_user_and_headers):
    """Test getting daily insight."""
    user_data, auth_headers = test_user_and_headers
    
    response = await client.get(
        "/engagement/insights/daily",
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "insight_text" in data
    assert "insight_type" in data
    print(f"✅ Daily insight: {data['insight_text'][:50]}...")


@pytest.mark.asyncio
async def test_get_mood_summary(client: httpx.AsyncClient, test_user_and_headers):
    """Test mood summary."""
    user_data, auth_headers = test_user_and_headers
    
    response = await client.get(
        "/engagement/mood/summary",
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "avg_mood" in data
    assert "total_logs" in data
    print(f"✅ Mood summary: avg={data['avg_mood']}, logs={data['total_logs']}")


@pytest.mark.asyncio
async def test_get_preferences(client: httpx.AsyncClient, test_user_and_headers):
    """Test getting preferences."""
    user_data, auth_headers = test_user_and_headers
    
    response = await client.get(
        "/engagement/preferences",
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "notification_time" in data
    print(f"✅ Preferences retrieved: theme={data.get('theme')}")


@pytest.mark.asyncio
async def test_update_preferences(client: httpx.AsyncClient, test_user_and_headers):
    """Test updating preferences."""
    user_data, auth_headers = test_user_and_headers
    
    preferences = {
        "notification_time": "09:00",
        "theme": "dark",
        "onboarding_completed": True,
        "skin_goals": ["acne", "hydration"],
        "reminder_enabled": True,
        "language": "en"
    }
    
    response = await client.put(
        "/engagement/preferences",
        headers=auth_headers,
        json=preferences
    )
    
    assert response.status_code == 200
    print(f"✅ Preferences updated")


# ============================================================================
# ERROR HANDLING TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_upload_invalid_file(client: httpx.AsyncClient, test_user_and_headers):
    """Test uploading non-image file."""
    user_data, auth_headers = test_user_and_headers
    
    files = {
        'file': ('test.txt', BytesIO(b'not an image'), 'text/plain')
    }
    
    response = await client.post(
        "/skin/upload",
        headers=auth_headers,
        files=files
    )
    
    assert response.status_code == 400
    print(f"✅ Invalid file rejected")


@pytest.mark.asyncio
async def test_missing_auth_header(client: httpx.AsyncClient):
    """Test endpoint without auth."""
    response = await client.get("/mood/history")
    assert response.status_code == 422  # Validation error
    print(f"✅ Missing auth rejected")


@pytest.mark.asyncio
async def test_invalid_user_id(client: httpx.AsyncClient):
    """Test with invalid UUID."""
    headers = {
        "X-User-Id": "not-a-uuid",
        "Authorization": "Bearer test"
    }
    
    response = await client.get(
        "/mood/history",
        headers=headers
    )
    
    assert response.status_code == 400
    print(f"✅ Invalid UUID rejected")


# ============================================================================
# SUMMARY
# ============================================================================

if __name__ == "__main__":
    print("\n" + "="*70)
    print("DERMORA API TEST SUITE")
    print("="*70)
    print("\nTo run tests:")
    print("  1. Start backend: uvicorn app.main:app --reload")
    print("  2. Run tests: pytest test_api.py -v")
    print("\nTest categories:")
    print("  - Public endpoints (no auth): 3 tests")
    print("  - Auth endpoints: 1 test")
    print("  - Skin endpoints: 3 tests")
    print("  - Mood endpoints: 2 tests")
    print("  - Voice endpoints: 1 test")
    print("  - Reports endpoints: 1 test")
    print("  - Engagement endpoints: 7 tests")
    print("  - Error handling: 3 tests")
    print("="*70 + "\n")
    
    pytest.main([__file__, "-v", "-s"])