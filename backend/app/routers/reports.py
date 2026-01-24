from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
from datetime import date, timedelta
from uuid import UUID
import json

from app.core.database import get_db
from app.schemas.reports import (
    WeeklyReportResponse,
    KeyInsight,
    Recommendation,
    WeeklyMetrics
)
from app.services.report_generator import ReportGenerator

router = APIRouter(prefix="/reports", tags=["Reports"])
report_generator = ReportGenerator()


async def _get_or_generate_report(
    user_id: UUID,
    week_start: date,
    force_regenerate: bool,
    db: AsyncSession
) -> tuple:
    """
    Internal function to get or generate report.
    Returns: (weekly_report_entity, was_generated)
    """
    
    from app.entities.weekly_report import WeeklyReport
    
    week_end = week_start + timedelta(days=6)
    
    # Check if report already exists
    if not force_regenerate:
        result = await db.execute(
            select(WeeklyReport).where(
                and_(
                    WeeklyReport.user_id == user_id,
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
        db, user_id, week_start, week_end
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
        report_data = await report_generator.generate_report_with_llm(context, user_id)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Report generation failed: {str(e)}"
        )
    
    # Generate HTML
    report_html = report_generator.generate_html_report(report_data, context)
    
    # Store in database (or update existing)
    if force_regenerate:
        # Update existing report
        result = await db.execute(
            select(WeeklyReport).where(
                and_(
                    WeeklyReport.user_id == user_id,
                    WeeklyReport.week_start == week_start
                )
            )
        )
        weekly_report = result.scalar_one_or_none()
        
        if weekly_report:
            # Update existing
            weekly_report.report_text = report_data["condition_summary"]
            weekly_report.report_html = report_html
            weekly_report.condition_summary = report_data["condition_summary"]
            weekly_report.key_insights = report_data.get("key_insights", [])
            weekly_report.recommendations = report_data.get("recommendations", [])
            weekly_report.skin_trend = context.get("current_week", {}).get("severity_trend", "unknown")
            weekly_report.metrics = {
                "average_severity": context.get("current_week", {}).get("average_severity_score"),
                "average_confidence": context.get("current_week", {}).get("average_confidence", 0.0),
                "improvement_percentage": context.get("current_week", {}).get("improvement_percentage"),
                "total_images": context["total_images"],
                "consistent_tracking": consistent_tracking,
                "days_tracked": days_tracked
            }
        else:
            # Create new
            weekly_report = WeeklyReport(
                user_id=user_id,
                week_start=week_start,
                week_end=week_end,
                skin_trend=context.get("current_week", {}).get("severity_trend", "unknown"),
                mood_trend="stable",
                report_text=report_data["condition_summary"],
                report_html=report_html,
                condition_summary=report_data["condition_summary"],
                key_insights=report_data.get("key_insights", []),
                recommendations=report_data.get("recommendations", []),
                metrics={
                    "average_severity": context.get("current_week", {}).get("average_severity_score"),
                    "average_confidence": context.get("current_week", {}).get("average_confidence", 0.0),
                    "improvement_percentage": context.get("current_week", {}).get("improvement_percentage"),
                    "total_images": context["total_images"],
                    "consistent_tracking": consistent_tracking,
                    "days_tracked": days_tracked
                },
                generated_by="azure-gpt-4o"
            )
            db.add(weekly_report)
    else:
        # Create new report
        from app.entities.weekly_report import WeeklyReport
        
        weekly_report = WeeklyReport(
            user_id=user_id,
            week_start=week_start,
            week_end=week_end,
            skin_trend=context.get("current_week", {}).get("severity_trend", "unknown"),
            mood_trend="stable",
            report_text=report_data["condition_summary"],
            report_html=report_html,
            condition_summary=report_data["condition_summary"],
            key_insights=report_data.get("key_insights", []),
            recommendations=report_data.get("recommendations", []),
            metrics={
                "average_severity": context.get("current_week", {}).get("average_severity_score"),
                "average_confidence": context.get("current_week", {}).get("average_confidence", 0.0),
                "improvement_percentage": context.get("current_week", {}).get("improvement_percentage"),
                "total_images": context["total_images"],
                "consistent_tracking": consistent_tracking,
                "days_tracked": days_tracked
            },
            generated_by="azure-gpt-4o"
        )
        db.add(weekly_report)
    
    await db.commit()
    await db.refresh(weekly_report)
    
    return weekly_report, True


@router.get("/weekly/{user_id}", response_model=WeeklyReportResponse)
async def get_weekly_report(
    user_id: UUID,
    week_start: date = None,
    force_regenerate: bool = False,
    db: AsyncSession = Depends(get_db)
):
    """
    Get or generate weekly report for a user (JSON format).
    
    - **user_id**: User UUID
    - **week_start**: Start date of week (defaults to current week Monday)
    - **force_regenerate**: Force regeneration even if report exists
    
    Returns comprehensive weekly health report with insights and recommendations.
    Cached in database - subsequent calls are instant and free!
    """
    
    # Default to current week (Monday as start)
    if not week_start:
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
    
    # Get or generate report (uses cache)
    weekly_report, was_generated = await _get_or_generate_report(
        user_id, week_start, force_regenerate, db
    )
    
    # Parse metrics from JSONB
    metrics_data = weekly_report.metrics or {}
    
    return WeeklyReportResponse(
        report_id=weekly_report.id,
        user_id=weekly_report.user_id,
        week_start=weekly_report.week_start,
        week_end=weekly_report.week_end,
        report_title=f"Weekly Report: {week_start.isoformat()}",
        condition_summary=weekly_report.condition_summary or "Report generated",
        report_html=weekly_report.report_html,
        report_pdf_url=weekly_report.report_pdf_url,
        key_insights=[KeyInsight(**insight) for insight in (weekly_report.key_insights or [])],
        recommendations=[Recommendation(**rec) for rec in (weekly_report.recommendations or [])],
        metrics=WeeklyMetrics(
            average_severity=metrics_data.get("average_severity"),
            average_confidence=metrics_data.get("average_confidence", 0.0),
            improvement_vs_last_week=metrics_data.get("improvement_percentage"),
            total_images_uploaded=metrics_data.get("total_images", 0),
            consistent_tracking=metrics_data.get("consistent_tracking", False),
            days_tracked=metrics_data.get("days_tracked", 0)
        ),
        generated_at=weekly_report.created_at,
        generated_by=weekly_report.generated_by or "azure-gpt-4o"
    )


@router.get("/weekly/{user_id}/html", response_class=HTMLResponse)
async def get_report_html(
    user_id: UUID,
    week_start: date = None,
    force_regenerate: bool = False,
    db: AsyncSession = Depends(get_db)
):
    """
    Get report as standalone HTML page (for in-app WebView).
    
    ✅ OPTIMIZED: Fetches from database cache if available.
    Only generates new report if cache miss or force_regenerate=true.
    """
    
    # Default to current week
    if not week_start:
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
    
    from app.entities.weekly_report import WeeklyReport
    
    # Try to get from cache first
    if not force_regenerate:
        result = await db.execute(
            select(WeeklyReport).where(
                and_(
                    WeeklyReport.user_id == user_id,
                    WeeklyReport.week_start == week_start
                )
            )
        )
        existing_report = result.scalar_one_or_none()
        
        if existing_report and existing_report.report_html:
            # Return cached HTML directly (no API call!)
            return HTMLResponse(content=existing_report.report_html)
    
    # Cache miss - generate new report
    weekly_report, was_generated = await _get_or_generate_report(
        user_id, week_start, force_regenerate, db
    )
    
    return HTMLResponse(content=weekly_report.report_html)


@router.get("/weekly/{user_id}/list")
async def list_user_reports(
    user_id: UUID,
    limit: int = 10,
    db: AsyncSession = Depends(get_db)
):
    """
    List all reports for a user (newest first).
    Use this to build a report history timeline in the app.
    """
    
    from app.entities.weekly_report import WeeklyReport
    
    result = await db.execute(
        select(WeeklyReport)
        .where(WeeklyReport.user_id == user_id)
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


@router.delete("/weekly/{report_id}")
async def delete_report(
    report_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a specific report.
    """
    
    from app.entities.weekly_report import WeeklyReport
    
    result = await db.execute(
        select(WeeklyReport).where(WeeklyReport.id == report_id)
    )
    report = result.scalar_one_or_none()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    await db.delete(report)
    await db.commit()
    
    return {"message": "Report deleted successfully", "report_id": str(report_id)}

