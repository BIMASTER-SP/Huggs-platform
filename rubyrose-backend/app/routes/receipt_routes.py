"""Receipt Routes - Cupom fiscal lookup, QR scan, history"""

import re
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request

from app.auth import require_auth, get_current_user
from app.config import settings
from app.database import receipts_db
from app.models import CupomLookupRequest, QRCodeScanRequest
from app.rate_limit import limiter
from app.responses import success_response
from app.utils import simulate_nfe_lookup, process_nfe

router = APIRouter(prefix="/api/receipts", tags=["Receipts"])


@router.post("/lookup")
@limiter.limit(settings.rate_limit_cupom_lookup)
def lookup_cupom(request: Request, req: CupomLookupRequest):
    clean_key = re.sub(r"\D", "", req.access_key)
    if len(clean_key) < 44:
        raise HTTPException(status_code=400, detail="Chave de acesso deve ter 44 digitos")
    nfe = simulate_nfe_lookup(clean_key)
    return success_response(data=nfe, message="Cupom consultado com sucesso")


@router.post("/scan")
@limiter.limit(settings.rate_limit_cupom_lookup)
def scan_qrcode(request: Request, req: QRCodeScanRequest, user: Optional[dict] = Depends(get_current_user)):
    qr_data = req.qr_data
    if "chNFe=" in qr_data:
        match = re.search(r"chNFe=(\d{44})", qr_data)
        clean_data = match.group(1) if match else re.sub(r"\D", "", qr_data)[:44]
    else:
        clean_data = re.sub(r"\D", "", qr_data)[:44]
    if len(clean_data) < 44:
        raise HTTPException(status_code=400, detail="QR Code invalido")
    nfe = simulate_nfe_lookup(clean_data)
    receipt = process_nfe(nfe, user)
    return success_response(
        data={"receipt": receipt},
        message=f"Cupom processado! +{nfe['total_points']} pontos",
    )


@router.get("")
def get_receipts(user: dict = Depends(require_auth)):
    user_receipts = [r for r in receipts_db if r.get("user_id") == user["id"]]
    return success_response(data={
        "total": len(user_receipts),
        "total_points": sum(r.get("total_points", 0) for r in user_receipts),
        "receipts": sorted(user_receipts, key=lambda x: x["created_at"], reverse=True),
    })
