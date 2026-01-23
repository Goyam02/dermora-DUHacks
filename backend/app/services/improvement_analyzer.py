from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc, func as sql_func
from datetime import datetime, timedelta, date
from typing import List, Dict, Optional, Tuple
from uuid import UUID

from app.entities.skin_image import SkinImage
from app.entities.skin_diagnosis import SkinDiagnosis
from app.entities.improvement_record import ImprovementRecord
from app.services.azure_vision import AzureVisionService
from app.schemas.skin import WeeklyProgress, MedicalAdvice, ImprovementTrackerResponse

class ImprovementAnalyzer:
    """Analyzes skin condition improvements over time"""
    
    def __init__(self):
        self.vision_service = AzureVisionService()
    
    @staticmethod
    def get_week_range(date_obj: date) -> Tuple[date, date]:
        """Get start and end of week for a given date (Monday-Sunday)"""
        start = date_obj - timedelta(days=date_obj.weekday())
        end = start + timedelta(days=6)
        return start, end
    
    async def calculate_weekly_metrics(
        self,
        db: AsyncSession,
        user_id: UUID,
        week_start: date,
        week_end: date
    ) -> Optional[Dict]:
        """Calculate metrics for a specific week"""
        
        # Get all images for this week
        result = await db.execute(
            select(SkinImage, SkinDiagnosis)
            .join(SkinDiagnosis, SkinImage.id == SkinDiagnosis.skin_image_id)
            .where(
                and_(
                    SkinImage.user_id == user_id,
                    SkinImage.captured_at >= datetime.combine(week_start, datetime.min.time()),
                    SkinImage.captured_at <= datetime.combine(week_end, datetime.max.time())
                )
            )
            .order_by(SkinImage.captured_at.asc())
        )
        rows = result.all()
        
        if not rows:
            return None
        
        # Calculate averages
        confidences = [diag.confidence for _, diag in rows]
        conditions = [diag.prediction for _, diag in rows]
        
        # Get most common condition
        from collections import Counter
        primary_condition = Counter(conditions).most_common(1)[0][0]
        
        initial_image = rows[0][0]
        latest_image = rows[-1][0]
        
        return {
            "week_start": week_start,
            "week_end": week_end,
            "primary_condition": primary_condition,
            "average_confidence": sum(confidences) / len(confidences),
            "total_images": len(rows),
            "initial_image_id": initial_image.id,
            "latest_image_id": latest_image.id,
            "initial_image_url": initial_image.image_url,
            "latest_image_url": latest_image.image_url
        }
    
    async def compare_weeks(
        self,
        db: AsyncSession,
        user_id: UUID,
        current_week_start: date,
        previous_week_start: date
    ) -> Dict:
        """Compare current week with previous week"""
        
        current_week_end = current_week_start + timedelta(days=6)
        previous_week_end = previous_week_start + timedelta(days=6)
        
        current_metrics = await self.calculate_weekly_metrics(
            db, user_id, current_week_start, current_week_end
        )
        previous_metrics = await self.calculate_weekly_metrics(
            db, user_id, previous_week_start, previous_week_end
        )
        
        if not current_metrics or not previous_metrics:
            return {
                "improvement_percentage": None,
                "severity_trend": "insufficient_data"
            }
        
        # Use Azure Vision for detailed comparison if available
        if self.vision_service.is_available():
            try:
                comparison = await self.vision_service.compare_images(
                    previous_metrics["latest_image_url"],
                    current_metrics["latest_image_url"]
                )
                
                return {
                    "improvement_percentage": comparison["improvement_percentage"],
                    "severity_trend": self._determine_trend(comparison["improvement_percentage"])
                }
            except Exception as e:
                print(f"Azure comparison failed: {e}")
        
        # Fallback: Compare confidence scores
        conf_improvement = (
            (current_metrics["average_confidence"] - previous_metrics["average_confidence"]) 
            / previous_metrics["average_confidence"] * 100
        )
        
        return {
            "improvement_percentage": conf_improvement,
            "severity_trend": self._determine_trend(conf_improvement)
        }
    
    @staticmethod
    def _determine_trend(improvement_percentage: float) -> str:
        """Determine severity trend from improvement percentage"""
        if improvement_percentage is None:
            return "unknown"
        if improvement_percentage > 10:
            return "improving"
        elif improvement_percentage < -10:
            return "worsening"
        else:
            return "stable"
    
    async def generate_medical_advice(
        self,
        db: AsyncSession,
        user_id: UUID,
        weekly_data: List[Dict]
    ) -> MedicalAdvice:
        """Generate AI-powered medical advice based on progress"""
        
        if not weekly_data:
            return MedicalAdvice(
                advice_text="Upload more images to track your progress.",
                needs_doctor_visit=False,
                urgency_level="low",
                reasoning="Insufficient data for analysis"
            )
        
        # Analyze trends
        recent_weeks = weekly_data[-4:]  # Last 4 weeks
        improvements = [w.get("improvement_percentage", 0) for w in recent_weeks if w.get("improvement_percentage")]
        
        if not improvements:
            avg_improvement = 0
        else:
            avg_improvement = sum(improvements) / len(improvements)
        
        # Determine advice
        if avg_improvement > 20:
            return MedicalAdvice(
                advice_text="Great progress! Your condition is improving significantly. Continue your current treatment plan and maintain good skin care habits.",
                needs_doctor_visit=False,
                urgency_level="low",
                reasoning=f"Average improvement of {avg_improvement:.1f}% over recent weeks"
            )
        elif avg_improvement > 0:
            return MedicalAdvice(
                advice_text="Your condition is showing mild improvement. Continue with your current routine and consider a follow-up appointment if progress slows.",
                needs_doctor_visit=False,
                urgency_level="low",
                reasoning=f"Steady improvement of {avg_improvement:.1f}%"
            )
        elif avg_improvement > -10:
            return MedicalAdvice(
                advice_text="Your condition appears stable. If you're not seeing the improvement you'd like, consult with a dermatologist to adjust your treatment plan.",
                needs_doctor_visit=True,
                urgency_level="medium",
                reasoning="Little to no improvement observed"
            )
        else:
            return MedicalAdvice(
                advice_text="Your condition appears to be worsening. We strongly recommend scheduling an appointment with a dermatologist as soon as possible.",
                needs_doctor_visit=True,
                urgency_level="high",
                reasoning=f"Condition worsening by {abs(avg_improvement):.1f}%"
            )
    
    async def get_improvement_tracker(
        self,
        db: AsyncSession,
        user_id: UUID,
        weeks: int = 12
    ) -> ImprovementTrackerResponse:
        """Get complete improvement tracker data"""
        
        end_date = date.today()
        start_date = end_date - timedelta(weeks=weeks)
        
        # Get or create weekly records
        weekly_data = []
        current_date = start_date
        
        while current_date <= end_date:
            week_start, week_end = self.get_week_range(current_date)
            
            # Check if record exists
            result = await db.execute(
                select(ImprovementRecord).where(
                    and_(
                        ImprovementRecord.user_id == user_id,
                        ImprovementRecord.week_start_date == week_start
                    )
                )
            )
            existing_record = result.scalar_one_or_none()
            
            if existing_record:
                weekly_data.append({
                    "week_start": existing_record.week_start_date,
                    "week_end": existing_record.week_end_date,
                    "primary_condition": existing_record.primary_condition,
                    "average_severity": existing_record.average_severity_score,
                    "average_confidence": existing_record.average_confidence,
                    "improvement_percentage": existing_record.improvement_percentage,
                    "severity_trend": existing_record.severity_trend,
                    "total_images": existing_record.total_images_this_week,
                    "initial_image_url": None,  # Can fetch if needed
                    "latest_image_url": None
                })
            else:
                # Calculate metrics for this week
                metrics = await self.calculate_weekly_metrics(db, user_id, week_start, week_end)
                if metrics:
                    # Compare with previous week
                    prev_week_start = week_start - timedelta(days=7)
                    comparison = await self.compare_weeks(db, user_id, week_start, prev_week_start)
                    
                    metrics.update(comparison)
                    weekly_data.append(metrics)
                    
                    # Store record for future use
                    record = ImprovementRecord(
                        user_id=user_id,
                        week_start_date=week_start,
                        week_end_date=week_end,
                        primary_condition=metrics["primary_condition"],
                        average_confidence=metrics["average_confidence"],
                        improvement_percentage=metrics.get("improvement_percentage"),
                        severity_trend=metrics.get("severity_trend", "unknown"),
                        initial_image_id=metrics.get("initial_image_id"),
                        latest_image_id=metrics.get("latest_image_id"),
                        total_images_this_week=metrics["total_images"]
                    )
                    db.add(record)
            
            current_date = week_end + timedelta(days=1)
        
        await db.commit()
        
        # Calculate overall metrics
        if weekly_data:
            improvements = [w["improvement_percentage"] for w in weekly_data if w.get("improvement_percentage")]
            overall_improvement = sum(improvements) / len(improvements) if improvements else None
            
            current_condition = weekly_data[-1]["primary_condition"]
            current_severity = weekly_data[-1].get("average_severity")
            
            # Find best and worst weeks
            weeks_with_improvement = [w for w in weekly_data if w.get("improvement_percentage")]
            best_week = max(weeks_with_improvement, key=lambda x: x["improvement_percentage"]) if weeks_with_improvement else None
            worst_week = min(weeks_with_improvement, key=lambda x: x["improvement_percentage"]) if weeks_with_improvement else None
        else:
            overall_improvement = None
            current_condition = "unknown"
            current_severity = None
            best_week = None
            worst_week = None
        
        # Generate medical advice
        medical_advice = await self.generate_medical_advice(db, user_id, weekly_data)
        
        # Build response
        return ImprovementTrackerResponse(
            user_id=str(user_id),
            tracking_period={
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "total_weeks": len(weekly_data)
            },
            overall_improvement=overall_improvement,
            current_condition=current_condition,
            current_severity=current_severity,
            trend=self._determine_trend(overall_improvement) if overall_improvement else "unknown",
            weekly_progress=[
                WeeklyProgress(
                    week_start=w["week_start"],
                    week_end=w["week_end"],
                    primary_condition=w["primary_condition"],
                    average_severity=w.get("average_severity"),
                    average_confidence=w["average_confidence"],
                    improvement_percentage=w.get("improvement_percentage"),
                    severity_trend=w.get("severity_trend", "unknown"),
                    total_images=w["total_images"],
                    initial_image_url=w.get("initial_image_url"),
                    latest_image_url=w.get("latest_image_url")
                ) for w in weekly_data
            ],
            medical_advice=medical_advice,
            best_week=best_week,
            worst_week=worst_week
        )
