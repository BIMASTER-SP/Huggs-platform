"""Reward Routes - Kits, redemptions, history"""

from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
import uuid

from app.auth import require_auth
from app.database import reward_kits_db, redemptions_db
from app.models import RedeemKitRequest
from app.responses import success_response

router = APIRouter(prefix="/api/rewards", tags=["Rewards"])


@router.get("/kits")
def list_reward_kits():
    available = [k for k in reward_kits_db if k.get("available", True)]
    return success_response(data={"total": len(available), "kits": available})


@router.post("/redeem")
def redeem_kit(req: RedeemKitRequest, user: dict = Depends(require_auth)):
    kit = None
    for k in reward_kits_db:
        if k["id"] == req.kit_id:
            kit = k
            break
    if not kit:
        raise HTTPException(status_code=404, detail="Kit nao encontrado")
    if user.get("points", 0) < kit["points_cost"]:
        raise HTTPException(status_code=400, detail=f"Pontos insuficientes. Voce tem {user['points']} pts, precisa de {kit['points_cost']} pts")
    user["points"] -= kit["points_cost"]
    redemption_id = f"redeem-{uuid.uuid4().hex[:8]}"
    redemption = {
        "id": redemption_id, "user_id": user["id"], "kit_id": kit["id"],
        "kit_name": kit["name"], "points_spent": kit["points_cost"],
        "shipping_address": req.shipping_address or "Endereco da loja vinculada",
        "status": "processando", "created_at": datetime.now(timezone.utc).isoformat(),
    }
    redemptions_db.append(redemption)
    return success_response(
        data={"redemption": redemption, "remaining_points": user["points"]},
        message=f"Kit '{kit['name']}' resgatado com sucesso! Sera enviado em ate 10 dias uteis.",
    )


@router.get("/history")
def get_redemption_history(user: dict = Depends(require_auth)):
    user_redemptions = [r for r in redemptions_db if r["user_id"] == user["id"]]
    return success_response(data={
        "total": len(user_redemptions),
        "redemptions": sorted(user_redemptions, key=lambda x: x["created_at"], reverse=True),
    })
