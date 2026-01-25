# reports.py
# FINAL FIXED VERSION – CACHE + METRICS SAFE (PYTHON 3.9)

from fastapi import APIRouter, Depends, HTTPException, Header
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
from datetime import date, timedelta
from uuid import UUID
from typing import Optional   # ✅ REQUIRED FOR PYTHON 3.9

from app.core.database import get_db
from app.entities.user import User
from app.entities.weekly_report import WeeklyReport
from app.schemas.reports import WeeklyMetrics
from app.schemas.reports_api import WeeklyReportAPIResponse
from app.services.report_generator import ReportGenerator

router = APIRouter(prefix="/reports", tags=["Reports"])
report_generator = ReportGenerator()


# ============================================================================
# 🔐 AUTH
# ============================================================================

async def get_current_user(
    db: AsyncSession = Depends(get_db),
    x_user_id: str = Header(..., alias="X-User-Id"),
) -> User:
    try:
        user_uuid = UUID(x_user_id)
    except ValueError:
        raise HTTPException(400, "Invalid user UUID")

    result = await db.execute(select(User).where(User.id == user_uuid))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(401, "User does not exist")

    return user


# ============================================================================
# 🔧 METRICS NORMALIZER
# ============================================================================

def normalize_metrics(raw_metrics: dict, *, days_tracked: int, consistent_tracking: bool) -> dict:
    normalized = {
        "average_severity": raw_metrics.get("average_severity"),
        "average_confidence": raw_metrics.get("average_confidence", 0.0),
        "improvement_vs_last_week": raw_metrics.get(
            "improvement_vs_last_week",
            raw_metrics.get("improvement_percentage")
        ),
        "total_images_uploaded": raw_metrics.get(
            "total_images_uploaded",
            raw_metrics.get("total_images", 0)
        ),
        "consistent_tracking": consistent_tracking,
        "days_tracked": days_tracked,
    }

    return WeeklyMetrics(**normalized).model_dump()


# ============================================================================
# INTERNAL HELPER
# ============================================================================

async def _get_or_generate_report(
    user: User,
    week_start: date,
    force_regenerate: bool,
    db: AsyncSession
):
    week_end = week_start + timedelta(days=6)

    # Cached report (auto-migrate metrics)
    if not force_regenerate:
        result = await db.execute(
            select(WeeklyReport).where(
                and_(
                    WeeklyReport.user_id == user.id,
                    WeeklyReport.week_start == week_start
                )
            )
        )
        existing = result.scalar_one_or_none()

        if existing and existing.report_html:
            raw_metrics = existing.metrics or {}

            existing.metrics = normalize_metrics(
                raw_metrics,
                days_tracked=raw_metrics.get("days_tracked", 0),
                consistent_tracking=raw_metrics.get("consistent_tracking", False),
            )

            await db.commit()
            await db.refresh(existing)
            return existing, False

    # Generate new report
    if not report_generator.is_available():
        raise HTTPException(503, "Report generation unavailable")

    context = await report_generator.gather_weekly_context(
        db, user.id, week_start, week_end
    )

    if not context:
        raise HTTPException(404, "No data found for this week")

    unique_dates = set()
    for diag in context.get("diagnoses", []):
        from datetime import datetime
        unique_dates.add(datetime.fromisoformat(diag["date"]).date())

    days_tracked = len(unique_dates)
    consistent_tracking = days_tracked >= 3

    report_data = await report_generator.generate_report_with_llm(context, user.id)

    metrics = normalize_metrics(
        report_data.get("metrics", {}),
        days_tracked=days_tracked,
        consistent_tracking=consistent_tracking,
    )

    report_html = report_generator.generate_html_report(report_data, context)

    weekly_report = WeeklyReport(
        user_id=user.id,
        week_start=week_start,
        week_end=week_end,
        condition_summary=report_data["condition_summary"],
        skin_trend=report_data["skin_trend"],
        metrics=metrics,
        key_insights=report_data["key_insights"],
        recommendations=report_data["recommendations"],
        report_html=report_html,
    )

    db.add(weekly_report)
    await db.commit()
    await db.refresh(weekly_report)

    return weekly_report, True


# ============================================================================
# ENDPOINT 1: WEEKLY REPORT (JSON)
# ============================================================================

@router.get("/weekly", response_model=WeeklyReportAPIResponse)
async def get_report_json(
    week_start: Optional[date] = None,   # ✅ FIXED
    force_regenerate: bool = False,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not week_start:
        today = date.today()
        week_start = today - timedelta(days=today.weekday())

    weekly_report, _ = await _get_or_generate_report(
        user, week_start, force_regenerate, db
    )

    return WeeklyReportAPIResponse(
        report_id=weekly_report.id,
        user_id=user.id,
        week_start=weekly_report.week_start,
        week_end=weekly_report.week_end,
        condition_summary=weekly_report.condition_summary,
        skin_trend=weekly_report.skin_trend,
        metrics=weekly_report.metrics,
        key_insights=weekly_report.key_insights,
        recommendations=weekly_report.recommendations,
        generated_at=weekly_report.created_at,
    )


# ============================================================================
# ENDPOINT 2: WEEKLY REPORT (HTML)
# ============================================================================

@router.get("/weekly/html")
async def get_report_html(
    week_start: Optional[date] = None,   # ✅ FIXED
    force_regenerate: bool = False,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not week_start:
        today = date.today()
        week_start = today - timedelta(days=today.weekday())

    weekly_report, _ = await _get_or_generate_report(
        user, week_start, force_regenerate, db
    )

    return HTMLResponse(content=weekly_report.report_html)
