"""
Professional Logging System
============================
Structured logging ready for AWS CloudWatch integration.

Future migration path:
  - Replace in-memory log store with CloudWatch Logs SDK (boto3)
  - Add log groups per module (auth, orders, admin, etc.)
  - Add correlation IDs for request tracing
  - Integrate with AWS X-Ray for distributed tracing
"""

import json
import logging
import uuid
from datetime import UTC, datetime

from app.database import activity_logs_db


# ============================================================
# STRUCTURED LOGGER (CloudWatch-ready format)
# ============================================================
class StructuredFormatter(logging.Formatter):
    """JSON formatter for structured logging, compatible with CloudWatch Logs."""

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.now(UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        if hasattr(record, "user_id"):
            log_entry["user_id"] = record.user_id
        if hasattr(record, "action"):
            log_entry["action"] = record.action
        if hasattr(record, "request_id"):
            log_entry["request_id"] = record.request_id
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_entry, ensure_ascii=False)


def setup_logging():
    """Configure application-wide structured logging."""
    handler = logging.StreamHandler()
    handler.setFormatter(StructuredFormatter())

    root_logger = logging.getLogger("rubyrose")
    root_logger.setLevel(logging.INFO)
    root_logger.addHandler(handler)

    return root_logger


# Application logger instance
app_logger = setup_logging()


def get_logger(name: str) -> logging.Logger:
    """Get a child logger for a specific module."""
    return app_logger.getChild(name)


# ============================================================
# ACTIVITY LOG (in-memory, ready for CloudWatch/DB migration)
# ============================================================
def log_activity(
    user_id: str,
    user_name: str,
    action: str,
    details: str = "",
    level: str = "info",
    module: str = "admin",
) -> dict:
    """
    Log an administrative activity.
    Stores in memory now; ready for CloudWatch Events or DynamoDB.
    """
    log_entry = {
        "id": f"log-{uuid.uuid4().hex[:8]}",
        "user_id": user_id,
        "user_name": user_name,
        "action": action,
        "details": details,
        "level": level,
        "module": module,
        "timestamp": datetime.now(UTC).isoformat(),
    }
    activity_logs_db.append(log_entry)

    # Keep max 1000 logs in memory (production: CloudWatch has no limit)
    if len(activity_logs_db) > 1000:
        activity_logs_db.pop(0)

    # Also log to structured logger
    logger = get_logger(module)
    log_msg = f"[{action}] {details} (user: {user_name})"
    if level == "error":
        logger.error(log_msg, extra={"user_id": user_id, "action": action})
    elif level == "warning":
        logger.warning(log_msg, extra={"user_id": user_id, "action": action})
    else:
        logger.info(log_msg, extra={"user_id": user_id, "action": action})

    return log_entry


def log_system_event(action: str, details: str = "", level: str = "info"):
    """Log a system event (no user context)."""
    return log_activity("system", "System", action, details, level, "system")
