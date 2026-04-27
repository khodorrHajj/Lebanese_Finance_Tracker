import logging

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, get_db, check_db_connection
from app.api.auth import router as auth_router
from app.api.wallets import router as wallets_router
from app.api.categories import router as categories_router
from app.api.tags import router as tags_router
from app.api.transactions import router as transactions_router
from app.api.rates import router as rates_router
from app.api.analytics import router as analytics_router
from app.api.ocr import router as ocr_router
from app.api.public import router as public_router
from app.api.recurring_schedules import router as recurring_schedules_router
from app.core.config import OCR_WARMUP_ON_STARTUP
from app.core.config import CORS_ALLOWED_ORIGINS, validate_production_config
from app.services.rate_service import fetch_and_store_latest_rate
from app.services.recurring_service import process_recurring_events
from app.services import ocr_service
from app.core.middleware import OriginGuardMiddleware, SecurityHeadersMiddleware

validate_production_config()

logger = logging.getLogger("liratrack")

app = FastAPI(
    title="LiraTrack",
    description="Personal finance tracker for the Lebanese market (LBP/USD)",
    version="0.3.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(OriginGuardMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

app.include_router(auth_router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(wallets_router, prefix="/api/v1/wallets", tags=["Wallets"])
app.include_router(categories_router, prefix="/api/v1/categories", tags=["Categories"])
app.include_router(tags_router, prefix="/api/v1/tags", tags=["Tags"])
app.include_router(transactions_router, prefix="/api/v1/transactions", tags=["Transactions"])
app.include_router(rates_router, prefix="/api/v1/rates", tags=["Exchange Rates"])
app.include_router(analytics_router, prefix="/api/v1/analytics", tags=["Analytics"])
app.include_router(ocr_router, prefix="/api/v1/ocr", tags=["OCR"])
app.include_router(public_router, prefix="/api/v1/public", tags=["Public"])
app.include_router(recurring_schedules_router, prefix="/api/v1/recurring-schedules", tags=["Recurring Schedules"])

scheduler = BackgroundScheduler()


def _scheduled_rate_fetch():
    db = SessionLocal()
    try:
        fetch_and_store_latest_rate(db)
    except Exception:
        logger.exception("Scheduled rate fetch failed")
    finally:
        db.close()


def _scheduled_recurring_processing():
    db = SessionLocal()
    try:
        process_recurring_events(db)
    except Exception:
        logger.exception("Scheduled recurring event processing failed")
    finally:
        db.close()


@app.on_event("startup")
def on_startup():
    scheduler.add_job(
        _scheduled_rate_fetch,
        "interval",
        minutes=60,
        id="rate_fetch",
        replace_existing=True,
    )
    scheduler.add_job(
        _scheduled_recurring_processing,
        "cron",
        hour=1,
        minute=0,
        id="recurring_events",
        replace_existing=True,
        coalesce=True,
        max_instances=1,
    )
    scheduler.start()
    logger.info("Recurring events scheduler configured for daily 01:00 runs")
    logger.info("Scheduler started — rate fetch every 60 min")

    if OCR_WARMUP_ON_STARTUP:
        # Optional warm-up for deployments that prefer paying the OCR startup cost upfront.
        ocr_service.load_ml_model()
        logger.info("OCR model warm-up started in background")
    else:
        logger.info("OCR warm-up skipped at startup; model will load on first OCR request")


@app.on_event("shutdown")
def on_shutdown():
    scheduler.shutdown(wait=False)
    logger.info("Scheduler shut down")


@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        if check_db_connection(db):
            return {"status": "healthy", "database": "connected"}
        raise RuntimeError("DB check returned False")
    except Exception:
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "database": "disconnected"},
        )
