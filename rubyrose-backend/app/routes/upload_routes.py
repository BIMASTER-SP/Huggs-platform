"""
Upload Routes - Image upload with validation, prepared for S3 migration.

Future migration path:
  - Replace local file storage with boto3 S3 upload
  - Add CloudFront CDN URLs for served images
  - Add image processing (resize, compress) with Pillow or Lambda
"""

import os
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from app.auth import require_auth, require_admin
from app.database import admin_images_db
from app.responses import success_response
from app.logger import log_activity
from app.utils import ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE, UPLOAD_DIR

router = APIRouter(prefix="/api/upload", tags=["Upload"])


@router.post("")
async def upload_image(
    file: UploadFile = File(...),
    user: dict = Depends(require_auth),
):
    """Upload an image with validation. Local storage now, S3 ready."""
    # Validate file type
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de arquivo nao permitido: {file.content_type}. Use: JPEG, PNG, WebP ou GIF",
        )

    # Read and validate size
    content = await file.read()
    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Arquivo muito grande ({len(content) / 1024 / 1024:.1f}MB). Maximo: {MAX_IMAGE_SIZE / 1024 / 1024:.0f}MB",
        )

    # Generate unique filename with validated extension
    ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "gif"}
    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "jpg"
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Extensao de arquivo nao permitida: .{ext}. Use: .jpg, .jpeg, .png, .webp ou .gif",
        )
    filename = f"{uuid.uuid4().hex}.{ext}"

    # Save locally (future: S3 upload)
    upload_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), UPLOAD_DIR)
    os.makedirs(upload_dir, exist_ok=True)
    filepath = os.path.join(upload_dir, filename)
    with open(filepath, "wb") as f:
        f.write(content)

    # Generate URL (future: CloudFront CDN URL)
    image_url = f"/uploads/{filename}"

    log_activity(
        user["id"], user["name"], "image_upload",
        f"Upload: {file.filename} ({len(content) / 1024:.0f}KB)",
        module="upload",
    )

    return success_response(
        data={
            "url": image_url,
            "filename": filename,
            "original_name": file.filename,
            "size": len(content),
            "content_type": file.content_type,
        },
        message="Imagem enviada com sucesso",
    )


@router.post("/admin")
async def admin_upload_image(
    file: UploadFile = File(...),
    name: str = "",
    product_id: int = 0,
    product_name: str = "",
    image_type: str = "produto",
    user: dict = Depends(require_admin),
):
    """Admin upload with metadata, registered in image gallery."""
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail=f"Tipo nao permitido: {file.content_type}")

    content = await file.read()
    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="Arquivo muito grande. Maximo: 5MB")

    ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "gif"}
    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "jpg"
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Extensao nao permitida: .{ext}")
    filename = f"{uuid.uuid4().hex}.{ext}"
    upload_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), UPLOAD_DIR)
    os.makedirs(upload_dir, exist_ok=True)
    filepath = os.path.join(upload_dir, filename)
    with open(filepath, "wb") as f:
        f.write(content)

    image_url = f"/uploads/{filename}"
    img_entry = {
        "id": f"img-{uuid.uuid4().hex[:8]}",
        "name": name or file.filename or filename,
        "url": image_url,
        "product_id": product_id if product_id else None,
        "product_name": product_name or None,
        "type": image_type,
        "size": len(content),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    admin_images_db.append(img_entry)

    log_activity(user["id"], user["name"], "admin_image_upload", f"Admin upload: {img_entry['name']}")

    return success_response(data={"image": img_entry}, message="Imagem enviada e registrada")
