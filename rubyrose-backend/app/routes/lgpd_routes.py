"""LGPD Compliance Routes - Privacy policy, consent, data export/deletion"""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException

from app.auth import require_auth, safe_user_response
from app.database import (
    challenge_submissions_db,
    lgpd_consents_db,
    orders_db,
    receipts_db,
    redemptions_db,
    stores_db,
    users_db,
)
from app.logger import log_activity
from app.models import LGPDConsentRequest
from app.responses import success_response

router = APIRouter(prefix="/api/lgpd", tags=["LGPD"])


@router.get("/privacy-policy")
def get_privacy_policy():
    return success_response(data={
        "title": "Politica de Privacidade - Ruby Rose B2B",
        "version": "2.0",
        "sections": [
            {"title": "1. Coleta de Dados", "content": "Coletamos dados necessarios para o funcionamento da plataforma B2B: nome, email, CPF, telefone, CNPJ da loja e dados de pedidos."},
            {"title": "2. Uso dos Dados", "content": "Utilizamos seus dados para: processar pedidos, calcular pontos e recompensas, personalizar desafios e campanhas."},
            {"title": "3. Compartilhamento", "content": "Seus dados podem ser compartilhados com o representante comercial Ruby Rose responsavel pela sua regiao."},
            {"title": "4. Seguranca", "content": "Seus dados sao protegidos com criptografia e controle de acesso por perfil."},
            {"title": "5. Direitos LGPD", "content": "Voce tem o direito de acessar, corrigir, exportar e solicitar a exclusao dos seus dados pessoais a qualquer momento."},
            {"title": "6. Consentimento", "content": "Ao se cadastrar, voce consente com a coleta e uso dos dados descritos nesta politica."},
            {"title": "7. Contato", "content": "Para duvidas sobre privacidade: privacy@rubyrose.com.br"},
        ],
        "last_updated": "2026-03-01",
    })


@router.post("/consent")
def submit_consent(req: LGPDConsentRequest, user: dict = Depends(require_auth)):
    lgpd_consents_db[user["email"]] = {
        "user_id": user["id"], "email": user["email"],
        "consent_data_collection": req.consent_data_collection,
        "consent_marketing": req.consent_marketing,
        "consent_third_party": req.consent_third_party,
        "timestamp": datetime.now(UTC).isoformat(),
    }
    user["lgpd_consent"] = req.consent_data_collection
    user["lgpd_consent_date"] = datetime.now(UTC).isoformat()
    return success_response(message="Consentimento registrado com sucesso")


@router.get("/consent")
def get_consent(user: dict = Depends(require_auth)):
    consent = lgpd_consents_db.get(user["email"])
    if not consent:
        return success_response(data=None, message="Nenhum consentimento registrado")
    return success_response(data=consent)


@router.get("/export")
def export_user_data(user: dict = Depends(require_auth)):
    user_orders = [o for o in orders_db if o["user_id"] == user["id"]]
    user_receipts = [r for r in receipts_db if r.get("user_id") == user["id"]]
    user_subs = [s for s in challenge_submissions_db if s["user_id"] == user["id"]]
    user_redemptions = [r for r in redemptions_db if r["user_id"] == user["id"]]
    return success_response(data={
        "personal_data": safe_user_response(user),
        "store": stores_db.get(user.get("store_cnpj", "")),
        "orders": user_orders, "receipts": user_receipts,
        "challenge_submissions": user_subs, "redemptions": user_redemptions,
        "consent": lgpd_consents_db.get(user["email"]),
        "exported_at": datetime.now(UTC).isoformat(),
    })


@router.delete("/data")
def delete_user_data(user: dict = Depends(require_auth)):
    if user.get("role") == "admin":
        raise HTTPException(status_code=400, detail="Nao e possivel excluir conta de administrador")
    email = user["email"]
    user_id = user["id"]
    log_activity(user_id, user["name"], "lgpd_delete", f"Dados removidos: {email}", module="lgpd")
    if email in users_db:
        del users_db[email]
    lgpd_consents_db.pop(email, None)
    # Remove user data from all collections
    for collection_ref in [orders_db, receipts_db, challenge_submissions_db, redemptions_db]:
        to_remove = [i for i, item in enumerate(collection_ref) if item.get("user_id") == user_id]
        for idx in reversed(to_remove):
            collection_ref.pop(idx)
    return success_response(message="Seus dados foram removidos conforme a LGPD. Esta acao e irreversivel.")
