# Dermora.ai

**Because your skin feels what you feel.**

Dermora.ai is an intelligent skin health platform that combines AI-powered diagnosis, mood tracking, conversational therapy, and environmental monitoring to provide comprehensive care for chronic skin conditions like eczema, psoriasis, and vitiligo.

## The Problem

Up to 33% of dermatology patients experience psychiatric symptoms, yet mental health support remains absent from skin care. Chronic conditions like eczema, psoriasis, and vitiligo are highly sensitive to emotional distress, environmental factors, and lifestyle triggers. Despite clear links between stress, trauma, humidity, UV exposure, and flare-ups, patients lack an intelligent tool to detect, track, and manage these conditions holistically.

## The Solution

Dermora.ai creates the experience of visiting a dermatologist who also happens to be a therapist. The platform tracks your skin, your mood, and your environment over time, connecting the dots between what you feel and what your skin experiences.

### Core Features

**Skin Disease Detection**
- Fine-tuned DINOv2 ViT model trained on specialized datasets for eczema, psoriasis, and vitiligo
- High-accuracy diagnosis across diverse skin tones
- Post-inference questionnaire that creates a personalized dermatologist-therapist experience

**Mood Logging and Tracking**
- Mood scores recorded and stored in NeonDB
- Historical mood pattern analysis
- Correlation tracking between emotional state and skin condition

**Solace: Voice-to-Voice Mental Health Agent**
- Gemini voice-to-voice AI for natural, empathetic conversations
- Adaptive prompts based on recent mood scores
- Real-time Speech-to-Text analysis of conversations
- Automatic mood scoring after each session

**Weekly Photo Log Analysis**
- Visual comparison of current skin condition to previous photos
- Progress tracking over time
- Detailed analysis of improvements or deteriorations

**Environmental Integration**
- Real-time weather data for user location
- Dashboard displaying current weather conditions
- Weather-aware insights and recommendations

**Comprehensive Report Generation**
- Combines skin condition data, mood patterns, and weather conditions
- Personalized care recommendations based on holistic analysis
- Identifies triggers and patterns across all data points

## Technical Architecture

### Tech Stack

**Frontend**
- React Native for cross-platform mobile experience (in development)
- Image upload interface
- Mood logging dashboard
- Solace voice agent integration
- Weekly photo comparison view
- Real-time weather display

**Backend**
- FastAPI for high-performance REST endpoints
- Image processing and disease prediction pipeline
- Mood data management and analysis
- Weather API integration
- Report generation engine
- STT processing for voice conversations

**Database**
- NeonDB for mood logs and user data storage
- Efficient querying for historical pattern analysis

**AI/ML Pipeline**
- DINOv2 ViT fine-tuned on HAM10000, DermNet NZ, and Figshare Vitiligo datasets
- Gemini voice-to-voice for conversational mental health support
- Speech-to-Text for conversation analysis and mood extraction
- Custom mood scoring algorithms

### Data Sources

- **HAM10000**: Comprehensive dermatology image dataset
- **Figshare Vitiligo**: Labeled vitiligo classification images
- **DermNet NZ**: 19,500+ images across 23 skin disease types

## System Workflow

1. **Initial Diagnosis**: User uploads skin image for DINOv2 ViT model analysis
2. **Dermatologist Experience**: Post-diagnosis questionnaire creates personalized consultation experience
3. **Mood Logging**: User records mood state, stored in NeonDB for pattern tracking
4. **Voice Sessions**: Solace, the mental health agent, engages in conversation with prompts adapted to recent mood scores
5. **Conversation Analysis**: Voice sessions are transcribed via STT and analyzed for mood scoring
6. **Weather Monitoring**: Dashboard displays real-time weather conditions for user location
7. **Weekly Photo Log**: System compares current skin photos to historical images
8. **Report Generation**: Comprehensive analysis combining skin progression, mood patterns, and weather data

## Impact and Scalability

Over 150 million people worldwide live with eczema, psoriasis, or vitiligo. Research shows that with early detection and consistent care, up to 80% of flare-ups are preventable, and 60-70% of cases improve significantly with timely intervention.

The platform's modular architecture allows for expansion to additional skin conditions, integration with wearable devices for enhanced environmental tracking, and scaling to support multiple languages and regional adaptations.

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/dermora-ai.git
cd dermora-ai

# Download the model from Hugging Face
# Visit https://huggingface.co/rachitgoyell/dermora-dinov2-vit-b-skin
# Download and place the model files in the models/ directory

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Backend setup
cd backend
uvicorn app.main:app --reload

# Frontend setup (in development)
# React Native app coming soon
```

## Configuration

A `.env.example` file is included in the repository. Copy it to create your `.env` file:

```bash
cp .env.example .env
```

Configure the following variables:

```
NEONDB_CONNECTION_STRING=your_neondb_connection
GEMINI_API_KEY=your_gemini_api_key
WEATHER_API_KEY=your_weather_api_key
MODEL_PATH=models/dermora-dinov2-vit-b-skin
```

Download the DINOv2 ViT model from [Hugging Face](https://huggingface.co/rachitgoyell/dermora-dinov2-vit-b-skin) and place it in the `models/` directory.

## Architecture Highlights

The system operates through distinct but interconnected modules:

- **Detection Engine**: DINOv2 ViT model for skin condition classification
- **Mood System**: NeonDB-backed logging with historical analysis
- **Solace**: Gemini voice-to-voice conversational AI with context-aware prompting
- **Analytics Engine**: Multi-factor report generation incorporating skin, mood, and weather
- **Comparison Tool**: Weekly photo analysis with visual progress tracking


## References

- Salari, N., et al. (2024). Global Prevalence of Anxiety, Depression, and Stress Among Patients with Skin Diseases. Journal of Prevention, 45, 611-649.
- Kroah-Hartman, M., et al. (2024). Environmental triggers of psoriasis and relationship to disease severity. British Journal of Dermatology, 190(6).
- Sharma, S., et al. (2023). Deep learning based model for detection of vitiligo skin disease. International Journal of Mathematical, Engineering and Management Sciences, 8(5), 1024.
- Hammad, M., et al. (2023). Enhanced deep learning approach for accurate eczema and psoriasis skin detection. Sensors, 23(16), 7295.

## License

This project is licensed under the MIT License.

---

**Dermora.ai** - Where dermatology meets psychology, powered by AI.