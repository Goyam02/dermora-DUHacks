import os
import uuid
import aiofiles
from pathlib import Path
from fastapi import UploadFile, HTTPException

class StorageService:
    """Handles local file storage. Can be extended for S3 later."""
    
    def __init__(self, base_path: str = "uploads/skin_images"):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)
    
    async def save_image(self, file: UploadFile, user_id: str) -> str:
        """Save uploaded image and return file path with leading slash for URL access."""
        
        # Validate file type
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Only image files are allowed")
        
        # Generate unique filename
        ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
        filename = f"{user_id}_{uuid.uuid4()}.{ext}"
        file_path = self.base_path / filename
        
        # Save file in chunks (memory-efficient)
        async with aiofiles.open(file_path, "wb") as f:
            while chunk := await file.read(1024 * 1024):  # 1MB chunks
                await f.write(chunk)
        
        url_path = f"/{str(file_path).replace(os.sep, '/')}"
        print(f"🔍 DEBUG - Saving image with URL path: {url_path}")  # Debug log
        return url_path
    
    def delete_image(self, file_path: str) -> bool:
        """Delete an image file."""
        try:
            # Remove leading slash if present for filesystem operations
            clean_path = file_path.lstrip('/')
            Path(clean_path).unlink(missing_ok=True)
            return True
        except Exception:
            return False
        
    def get_full_path(self, relative_path: str) -> str:
        """Convert relative path to full filesystem path."""
        # Remove leading slash for filesystem operations
        clean_path = relative_path.lstrip('/')
        return str(Path(clean_path))