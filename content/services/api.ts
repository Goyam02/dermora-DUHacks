import axios from 'axios';

// Create an Axios instance with default configuration
const api = axios.create({
    baseURL: 'http://localhost:8000', // Assumes backend is running on this port
    headers: {
        'Content-Type': 'application/json',
    },
});

// Types for API responses
export interface SkinAnalysisResult {
    prediction: string;
    confidence: number;
    severity_score?: number; // Optional as per backend logic
}

export interface SkinImageUploadResponse {
    image_id: string;
    image_url: string;
    prediction: string;
    confidence: number;
    captured_at: string;
    message: string;
}

export interface MoodLogData {
    mood_score: number;
    stress: number;
    anxiety: number;
    energy: number;
    logged_at: string;
}

export interface VoicePromptData {
    mood_category: string;
    mood_score: number;
    system_prompt: string;
    suggested_duration: number;
    follow_up_recommended: boolean;
}

// API Service Functions

// --- Detect / Skin API ---

export const uploadSkinImage = async (file: File, userId: string = "test-user", imageType: string = "weekly"): Promise<SkinImageUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    // Note: Backend expects query params for user_id and image_type in the upload endpoint wrapper,
    // but looking at routers/skin.py line 62, it takes them as query params args to the function.
    // FastAPI handles this automatically if they are distinct from File/Form.
    // Let's pass them as params.
    const response = await api.post('/skin/upload', formData, {
        params: {
            user_id: userId,
            image_type: imageType
        },
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const getSkinHistory = async (userId: string) => {
    // Assuming there's an endpoint list images, but checking routers/skin.py...
    // It has /progress/{user_id}/comparison
    const response = await api.get(`/skin/progress/${userId}/comparison`);
    return response.data;
};

export const getImprovementTracker = async (userId: string) => {
    const response = await api.get(`/skin/api/skin/improvement-tracker/${userId}`); // Double check path
    // Reading skin.py again, router prefix is /skin. 
    // endpoint is /improvement-tracker/{user_id}
    // so url is /skin/improvement-tracker/{user_id}
    return (await api.get(`/skin/improvement-tracker/${userId}`)).data;
}


// --- Mood API ---

export const logMood = async (data: MoodLogData) => {
    const response = await api.post('/mood/log', data);
    return response.data;
};

export const getMoodQuestions = async () => {
    const response = await api.get('/mood/questions');
    return response.data;
}

// --- Solace / Voice API ---

export const getVoicePrompt = async (userId: string): Promise<VoicePromptData> => {
    const response = await api.get(`/voice/prompt/${userId}`);
    return response.data;
};

// --- Reports API ---
export const getWeeklyReport = async (userId: string) => {
    const response = await api.get(`/reports/weekly/${userId}`);
    return response.data;
}

export default api;
