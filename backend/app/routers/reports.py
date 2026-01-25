# reports.py
# Updated to match skin.py structure exactly
# Uses local get_current_user dependency with X-User-Id header
# Returns User entity, not dict

from fastapi import APIRouter, Depends, HTTPException, Header
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
from datetime import date, timedelta
from uuid import UUID

from app.core.database import get_db
from app.entities.user import User
from app.entities.weekly_report import WeeklyReport
from app.schemas.reports import (
    WeeklyReportResponse,
    KeyInsight,
    Recommendation,
    WeeklyMetrics
)
from app.services.report_generator import ReportGenerator

router = APIRouter(prefix="/reports", tags=["Reports"])
report_generator = ReportGenerator()


# ============================================================================
# 🔐 UUID USER DEPENDENCY (MATCHING skin.py)
# ============================================================================

async def get_current_user(
    db: AsyncSession = Depends(get_db),
    x_user_id: str = Header(..., alias="X-User-Id"),
) -> User:
    """
    Extract UUID from header and fetch user.
    """
    try:
        user_uuid = UUID(x_user_id)
    except ValueError:
        raise HTTPException(400, "Invalid user UUID")

    result = await db.execute(
        select(User).where(User.id == user_uuid)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(401, "User does not exist")

    return user


# ============================================================================
# INTERNAL HELPER
# ============================================================================

async def _get_or_generate_report(
    user: User,
    week_start: date,
    force_regenerate: bool,
    db: AsyncSession
) -> tuple:
    """
    Internal function to get or generate report for authenticated user.
    Returns: (weekly_report_entity, was_generated)
    """
    
    week_end = week_start + timedelta(days=6)
    
    # Check if report already exists for this user
    if not force_regenerate:
        result = await db.execute(
            select(WeeklyReport).where(
                and_(
                    WeeklyReport.user_id == user.id,
                    WeeklyReport.week_start == week_start
                )
            )
        )
        existing_report = result.scalar_one_or_none()
        
        if existing_report and existing_report.report_html:
            # Return cached report
            return existing_report, False
    
    # Generate new report
    if not report_generator.is_available():
        raise HTTPException(
            status_code=503,
            detail="Report generation unavailable. Azure OpenAI not configured."
        )
    
    context = await report_generator.gather_weekly_context(
        db, user.id, week_start, week_end
    )
    
    if not context:
        raise HTTPException(
            status_code=404,
            detail=f"No data found for week {week_start} to {week_end}. Upload some images first!"
        )
    
    # Calculate days tracked
    unique_dates = set()
    for diag in context.get("diagnoses", []):
        from datetime import datetime
        diag_date = datetime.fromisoformat(diag["date"]).date()
        unique_dates.add(diag_date)
    days_tracked = len(unique_dates)
    consistent_tracking = days_tracked >= 3
    
    # Generate report with LLM (this is the expensive call)
    try:
        report_data = await report_generator.generate_report_with_llm(context, user.id)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Report generation failed: {str(e)}"
        )
    
    # Generate HTML
    report_html = report_generator.generate_html_report(report_data, context)
    
    # Store in database (or update existing)
    weekly_report = WeeklyReport(
        user_id=user.id,
        week_start=week_start,
        week_end=week_end,
        condition_summary=report_data["condition_summary"],
        skin_trend=report_data["skin_trend"],
        metrics=report_data["metrics"],
        key_insights=report_data["key_insights"],
        recommendations=report_data["recommendations"],
        report_html=report_html,
    )
    db.add(weekly_report)
    await db.commit()
    await db.refresh(weekly_report)
    
    return weekly_report, True


# ============================================================================
# ENDPOINT 1: GET/GENERATE WEEKLY REPORT (JSON)
# ============================================================================

@router.get("/weekly", response_model=WeeklyReportResponse)
async def get_report_json(
    week_start: date = None,
    force_regenerate: bool = False,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Get or generate weekly report for authenticated user (JSON format).
    
    * week_start: Start date of week (defaults to current week Monday)
    * force_regenerate: Force regeneration even if report exists
    
    Returns comprehensive weekly health report with insights and recommendations. 
    Cached in database - subsequent calls are instant and free!
    """
    
    # Default to current week
    if not week_start:
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
    
    weekly_report, was_generated = await _get_or_generate_report(
        user, week_start, force_regenerate, db
    )
    
    return WeeklyReportResponse(
        report_id=str(weekly_report.id),
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
# ENDPOINT 2: GET WEEKLY REPORT (HTML)
# ============================================================================

@router.get("/weekly/html")
async def get_report_html(
    week_start: date = None,
    force_regenerate: bool = False,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Get report as standalone HTML page for authenticated user (for in-app WebView).
    
    ✅ OPTIMIZED: Fetches from database cache if available.
    Only generates new report if cache miss or force_regenerate=true.
    """
    
    # Default to current week
    if not week_start:
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
    
    weekly_report, was_generated = await _get_or_generate_report(
        user, week_start, force_regenerate, db
    )
    
    return HTMLResponse(content=weekly_report.report_html)


# ============================================================================
# ENDPOINT 3: LIST USER REPORTS
# ============================================================================

@router.get("/weekly/list")
async def list_user_reports(
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    List all reports for authenticated user (newest first).
    Use this to build a report history timeline in the app.
    """
    
    result = await db.execute(
        select(WeeklyReport)
        .where(WeeklyReport.user_id == user.id)
        .order_by(desc(WeeklyReport.week_start))
        .limit(limit)
    )
    reports = result.scalars().all()
    
    return {
        "total_reports": len(reports),
        "reports": [
            {
                "report_id": str(r.id),
                "week_start": r.week_start.isoformat(),
                "week_end": r.week_end.isoformat(),
                "summary": r.condition_summary,
                "trend": r.skin_trend,
                "generated_at": r.created_at.isoformat(),
                "has_html": r.report_html is not None,
                "metrics": r.metrics
            }
            for r in reports
        ]
    }


# ============================================================================
# ENDPOINT 4: DELETE REPORT
# ============================================================================

@router.delete("/weekly/{report_id}")
async def delete_report(
    report_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Delete a specific report for authenticated user.
    """
    
    result = await db.execute(
        select(WeeklyReport).where(
            WeeklyReport.id == report_id,
            WeeklyReport.user_id == user.id  # Ensure ownership
        )
    )
    report = result.scalar_one_or_none()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    await db.delete(report)
    await db.commit()
    
    return {"message": "Report deleted successfully", "report_id": str(report_id)}