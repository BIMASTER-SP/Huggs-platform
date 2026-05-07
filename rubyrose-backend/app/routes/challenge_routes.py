"""Challenge Routes - List, submit, create challenges"""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException

from app.auth import require_auth
from app.database import challenge_submissions_db, challenges_db, reward_kits_db
from app.logger import log_activity
from app.models import ChallengeSubmissionRequest
from app.responses import success_response

router = APIRouter(prefix="/api/challenges", tags=["Challenges"])


@router.get("")
def list_challenges(user: dict = Depends(require_auth)):
    active = [c for c in challenges_db if c["active"]]
    user_subs = [s for s in challenge_submissions_db if s["user_id"] == user["id"]]
    result = []
    for c in active:
        subs = [s for s in user_subs if s["challenge_id"] == c["id"]]
        kit = None
        if c.get("reward_kit_id"):
            for k in reward_kits_db:
                if k["id"] == c["reward_kit_id"]:
                    kit = k
                    break
        result.append({
            **c, "progress": len(subs),
            "completed": len(subs) >= c["goal"], "reward_kit": kit,
        })
    return success_response(data={"total": len(result), "challenges": result})


@router.post("/submit")
def submit_challenge(req: ChallengeSubmissionRequest, user: dict = Depends(require_auth)):
    challenge = None
    for c in challenges_db:
        if c["id"] == req.challenge_id:
            challenge = c
            break
    if not challenge:
        raise HTTPException(status_code=404, detail="Desafio nao encontrado")
    if not challenge["active"]:
        raise HTTPException(status_code=400, detail="Este desafio nao esta mais ativo")
    user_subs = [s for s in challenge_submissions_db if s["user_id"] == user["id"] and s["challenge_id"] == req.challenge_id]
    if len(user_subs) >= challenge["goal"]:
        raise HTTPException(status_code=400, detail="Voce ja completou este desafio!")
    sub_id = f"sub-{uuid.uuid4().hex[:8]}"
    submission = {
        "id": sub_id, "user_id": user["id"], "challenge_id": req.challenge_id,
        "photo_url": req.photo_url or f"https://storage.rubyrose.com/vitrines/{sub_id}.jpg",
        "notes": req.notes, "status": "pendente",
        "created_at": datetime.now(UTC).isoformat(),
    }
    challenge_submissions_db.append(submission)
    new_count = len(user_subs) + 1
    completed = new_count >= challenge["goal"]
    if completed:
        user["points"] = user.get("points", 0) + challenge["points_reward"]
        user["challenges_completed"] = user.get("challenges_completed", 0) + 1
    log_activity(user["id"], user["name"], "challenge_submit", f"Desafio {challenge['title']}: {new_count}/{challenge['goal']}", module="challenges")
    return success_response(
        data={"submission": submission, "progress": new_count, "goal": challenge["goal"], "completed": completed, "points_earned": challenge["points_reward"] if completed else 0},
        message="Envio registrado com sucesso!" + (" Desafio concluido! Parabens!" if completed else f" {new_count}/{challenge['goal']}"),
    )
