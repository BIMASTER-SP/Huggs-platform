"""Banner Routes - Public banners and admin CRUD"""

from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
import uuid

from app.auth import require_admin
from app.database import banners_db
from app.models import BannerCreateRequest, BannerUpdateRequest
from app.responses import success_response
from app.logger import log_activity

router = APIRouter(tags=["Banners"])


@router.get("/api/banners")
def get_active_banners():
    active = sorted([b for b in banners_db if b["active"]], key=lambda x: x.get("position", 999))
    return success_response(data={"total": len(active), "banners": active})


@router.get("/api/admin/banners")
def list_all_banners(user: dict = Depends(require_admin)):
    return success_response(data={
        "total": len(banners_db),
        "banners": sorted(banners_db, key=lambda x: x.get("position", 999)),
    })


@router.post("/api/admin/banners")
def create_banner(req: BannerCreateRequest, user: dict = Depends(require_admin)):
    banner_id = f"banner-{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc).isoformat()
    banner = {
        "id": banner_id, "title": req.title, "subtitle": req.subtitle,
        "description": req.description, "image_url": req.image_url, "color": req.color,
        "highlight": req.highlight, "position": req.position, "active": req.active,
        "start_date": req.start_date, "end_date": req.end_date, "created_by": user["id"],
        "created_at": now, "updated_at": now,
    }
    banners_db.append(banner)
    log_activity(user["id"], user["name"], "banner_create", f"Banner criado: {req.title}")
    return success_response(data={"banner": banner}, message="Banner criado com sucesso")


@router.put("/api/admin/banners/{banner_id}")
def update_banner(banner_id: str, req: BannerUpdateRequest, user: dict = Depends(require_admin)):
    for b in banners_db:
        if b["id"] == banner_id:
            for field, value in req.model_dump(exclude_none=True).items():
                b[field] = value
            b["updated_at"] = datetime.now(timezone.utc).isoformat()
            log_activity(user["id"], user["name"], "banner_update", f"Banner atualizado: {b['title']}")
            return success_response(data={"banner": b}, message="Banner atualizado")
    raise HTTPException(status_code=404, detail="Banner nao encontrado")


@router.delete("/api/admin/banners/{banner_id}")
def delete_banner(banner_id: str, user: dict = Depends(require_admin)):
    for i, b in enumerate(banners_db):
        if b["id"] == banner_id:
            banners_db.pop(i)
            log_activity(user["id"], user["name"], "banner_delete", f"Banner removido: {b['title']}")
            return success_response(message="Banner removido")
    raise HTTPException(status_code=404, detail="Banner nao encontrado")


@router.patch("/api/admin/banners/{banner_id}/toggle")
def admin_toggle_banner(banner_id: str, user: dict = Depends(require_admin)):
    for b in banners_db:
        if b["id"] == banner_id:
            b["active"] = not b["active"]
            st = "ativado" if b["active"] else "desativado"
            log_activity(user["id"], user["name"], "banner_toggle", f"Banner {st}: {b['title']}")
            return success_response(data={"banner": b}, message=f"Banner {st}")
    raise HTTPException(status_code=404, detail="Banner nao encontrado")
