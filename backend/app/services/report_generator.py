# ============================================================================
# FILE: backend/app/services/report_generator.py (FIXED VERSION)
# ============================================================================

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc, func
from datetime import datetime, timedelta, date
from typing import Dict, List, Optional
from uuid import UUID
import json

from app.entities.skin_image import SkinImage
from app.entities.skin_diagnosis import SkinDiagnosis
from app.entities.improvement_record import ImprovementRecord
from app.core.config import settings
from app.services.improvement_analyzer import ImprovementAnalyzer

class ReportGenerator:
    """Generates comprehensive weekly reports using Azure OpenAI"""
    
    def __init__(self):
        self.analyzer = ImprovementAnalyzer()
        
        # Initialize Azure OpenAI client if configured
        if settings.AZURE_OPENAI_API_KEY:
            from openai import AzureOpenAI
            self.client = AzureOpenAI(
                api_key=settings.AZURE_OPENAI_API_KEY,
                api_version=settings.AZURE_OPENAI_API_VERSION,
                azure_endpoint=settings.AZURE_OPENAI_ENDPOINT
            )
        else:
            self.client = None
    
    def is_available(self) -> bool:
        """Check if report generation is available"""
        return self.client is not None
    
    async def gather_weekly_context(
        self,
        db: AsyncSession,
        user_id: UUID,
        week_start: date,
        week_end: date
    ) -> Optional[Dict]:
        """Gather all data for the week to send to LLM"""
        
        # Get all skin images and diagnoses for the week
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
        images_data = result.all()
        
        if not images_data:
            return None
        
        # Build diagnoses list
        diagnoses_list = []
        conditions = []
        confidences = []
        
        for img, diag in images_data:
            diagnoses_list.append({
                "date": img.captured_at.isoformat(),
                "condition": diag.prediction,
                "confidence": diag.confidence,
                "image_type": img.image_type
            })
            conditions.append(diag.prediction)
            confidences.append(diag.confidence)
        
        # Determine primary condition (most common)
        from collections import Counter
        primary_condition = Counter(conditions).most_common(1)[0][0]
        average_confidence = sum(confidences) / len(confidences)
        
        # Get improvement record if exists
        result = await db.execute(
            select(ImprovementRecord).where(
                and_(
                    ImprovementRecord.user_id == user_id,
                    ImprovementRecord.week_start_date == week_start
                )
            )
        )
        improvement_record = result.scalar_one_or_none()
        
        # Get previous week for comparison
        prev_week_start = week_start - timedelta(days=7)
        prev_week_end = prev_week_start + timedelta(days=6)
        
        result = await db.execute(
            select(ImprovementRecord).where(
                and_(
                    ImprovementRecord.user_id == user_id,
                    ImprovementRecord.week_start_date == prev_week_start
                )
            )
        )
        previous_week_record = result.scalar_one_or_none()
        
        # Build current week data
        current_week_data = {
            "primary_condition": primary_condition,
            "average_confidence": average_confidence,
            "improvement_percentage": None,
            "severity_trend": "unknown",
            "medical_advice": None
        }
        
        if improvement_record:
            current_week_data.update({
                "improvement_percentage": improvement_record.improvement_percentage,
                "severity_trend": improvement_record.severity_trend or "unknown",
                "medical_advice": improvement_record.medical_advice,
                "average_severity_score": improvement_record.average_severity_score
            })
        
        # Build previous week data
        previous_week_data = None
        if previous_week_record:
            previous_week_data = {
                "primary_condition": previous_week_record.primary_condition,
                "average_confidence": previous_week_record.average_confidence,
                "improvement_percentage": previous_week_record.improvement_percentage
            }
        
        # Build context dictionary
        context = {
            "week_period": {
                "start": week_start.isoformat(),
                "end": week_end.isoformat()
            },
            "total_images": len(images_data),
            "diagnoses": diagnoses_list,
            "current_week": current_week_data,
            "previous_week": previous_week_data
        }
        
        return context
    
    async def generate_report_with_llm(
        self,
        context: Dict,
        user_id: UUID
    ) -> Dict:
        """Use Azure OpenAI to generate comprehensive report"""
        
        if not self.is_available():
            raise Exception("Azure OpenAI not configured")
        
        week_start = context["week_period"]["start"]
        week_end = context["week_period"]["end"]
        current_week = context.get("current_week", {})
        
        prompt = f"""You are a dermatology AI assistant creating a comprehensive weekly skin health report.

**Patient Context:**
- Week: {week_start} to {week_end}
- Total images uploaded: {context["total_images"]}
- Current condition: {current_week.get("primary_condition", "unknown")}
- Improvement vs last week: {current_week.get("improvement_percentage", "N/A")}%
- Severity trend: {current_week.get("severity_trend", "unknown")}

**Detailed Diagnoses:**
{json.dumps(context["diagnoses"], indent=2)}

**Previous Week Comparison:**
{json.dumps(context.get("previous_week", {}), indent=2)}

Generate a comprehensive medical report in JSON format with:

1. **report_title**: Catchy, encouraging title (e.g., "Week of Progress: Your Eczema Journey")
2. **condition_summary**: 2-3 sentence overview of the week's skin condition status
3. **key_insights**: Array of 3-5 insights, each with:
   - title: Short insight title
   - description: Detailed explanation
   - severity: 'positive', 'neutral', or 'negative'
   - icon: Relevant emoji (📈, ⚠️, ✅, 📊, 🎯)

4. **recommendations**: Array of 3-5 actionable recommendations, each with:
   - category: 'treatment', 'lifestyle', or 'monitoring'
   - action: Specific action to take
   - priority: 'high', 'medium', or 'low'
   - reasoning: Why this recommendation matters

5. **metrics_interpretation**: Natural language explanation of the numbers

6. **next_steps**: What the patient should do next week

Respond ONLY with valid JSON in this exact structure:
{{
    "report_title": "Your Week in Skin Health",
    "condition_summary": "...",
    "key_insights": [
        {{
            "title": "...",
            "description": "...",
            "severity": "positive",
            "icon": "📈"
        }}
    ],
    "recommendations": [
        {{
            "category": "treatment",
            "action": "...",
            "priority": "high",
            "reasoning": "..."
        }}
    ],
    "metrics_interpretation": "...",
    "next_steps": "..."
}}

Be encouraging but honest. Use medical terminology accurately but explain it clearly. Focus on actionable insights."""

        try:
            response = self.client.chat.completions.create(
                model=settings.AZURE_OPENAI_DEPLOYMENT,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a compassionate dermatology AI assistant creating personalized weekly skin health reports. Be professional, encouraging, and actionable."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=2000,
                temperature=0.7
            )
            
            # Parse JSON response
            response_text = response.choices[0].message.content
            
            # Remove markdown code blocks if present
            if response_text.startswith("```json"):
                response_text = response_text.replace("```json", "").replace("```", "").strip()
            elif response_text.startswith("```"):
                response_text = response_text.replace("```", "").strip()
            
            report_json = json.loads(response_text)
            return report_json
            
        except json.JSONDecodeError as e:
            print(f"JSON decode error: {e}")
            print(f"Raw response: {response_text}")
            raise Exception(f"Failed to parse LLM response as JSON: {str(e)}")
        except Exception as e:
            print(f"LLM generation error: {e}")
            raise
    
    def generate_html_report(
        self,
        report_data: Dict,
        context: Dict
    ) -> str:
        """Generate rich HTML for in-app display"""
        
        week_start = context["week_period"]["start"]
        week_end = context["week_period"]["end"]
        current_week = context.get("current_week", {})
        
        html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }}
        .report-header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 20px;
        }}
        .report-title {{
            font-size: 28px;
            font-weight: bold;
            margin: 0 0 10px 0;
        }}
        .week-period {{
            font-size: 14px;
            opacity: 0.9;
        }}
        .section {{
            background: white;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .section-title {{
            font-size: 20px;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 15px;
        }}
        .insight {{
            padding: 15px;
            margin-bottom: 10px;
            border-radius: 8px;
            border-left: 4px solid;
        }}
        .insight.positive {{ 
            background: #f0fdf4; 
            border-color: #10b981;
        }}
        .insight.negative {{ 
            background: #fef2f2; 
            border-color: #ef4444;
        }}
        .insight.neutral {{ 
            background: #f0f9ff; 
            border-color: #3b82f6;
        }}
        .insight-title {{
            font-weight: 600;
            margin-bottom: 5px;
        }}
        .recommendation {{
            padding: 15px;
            margin-bottom: 10px;
            background: #fafafa;
            border-radius: 8px;
            border-left: 3px solid #667eea;
        }}
        .priority-badge {{
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            margin-left: 10px;
        }}
        .priority-high {{ background: #fecaca; color: #991b1b; }}
        .priority-medium {{ background: #fed7aa; color: #9a3412; }}
        .priority-low {{ background: #bfdbfe; color: #1e3a8a; }}
        .metrics-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }}
        .metric-card {{
            background: #f8fafc;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
        }}
        .metric-value {{
            font-size: 24px;
            font-weight: bold;
            color: #667eea;
        }}
        .metric-label {{
            font-size: 12px;
            color: #64748b;
            margin-top: 5px;
        }}
    </style>
</head>
<body>
    <div class="report-header">
        <div class="report-title">{report_data.get('report_title', 'Weekly Health Report')}</div>
        <div class="week-period">{week_start} to {week_end}</div>
    </div>
    
    <div class="section">
        <div class="section-title">📋 Summary</div>
        <p>{report_data.get('condition_summary', 'Report generated successfully.')}</p>
    </div>
    
    <div class="section">
        <div class="section-title">💡 Key Insights</div>
        {''.join([f'''
        <div class="insight {insight.get('severity', 'neutral')}">
            <div class="insight-title">{insight.get('icon', '📊')} {insight.get('title', 'Insight')}</div>
            <div>{insight.get('description', '')}</div>
        </div>
        ''' for insight in report_data.get('key_insights', [])])}
    </div>
    
    <div class="section">
        <div class="section-title">🎯 Recommendations</div>
        {''.join([f'''
        <div class="recommendation">
            <div>
                <strong>{rec.get('action', '')}</strong>
                <span class="priority-badge priority-{rec.get('priority', 'medium')}">{rec.get('priority', 'MEDIUM').upper()}</span>
            </div>
            <div style="margin-top: 8px; color: #666; font-size: 14px;">
                {rec.get('reasoning', '')}
            </div>
        </div>
        ''' for rec in report_data.get('recommendations', [])])}
    </div>
    
    <div class="section">
        <div class="section-title">📊 This Week's Metrics</div>
        <p>{report_data.get('metrics_interpretation', 'No metrics interpretation available.')}</p>
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value">{context['total_images']}</div>
                <div class="metric-label">Images Uploaded</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">{current_week.get('average_confidence', 0):.0%}</div>
                <div class="metric-label">Avg Confidence</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">{current_week.get('improvement_percentage') or 0:+.1f}%</div>
                <div class="metric-label">Change vs Last Week</div>
            </div>
        </div>
    </div>
    
    <div class="section">
        <div class="section-title">🔮 Next Steps</div>
        <p>{report_data.get('next_steps', 'Continue tracking your progress weekly.')}</p>
    </div>
</body>
</html>
"""
        return html