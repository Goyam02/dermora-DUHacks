// api.ts (Updated to include all skin-related endpoints. Added functions for analyzeExisting, compareImages, deleteImage, refreshImprovement. For getSkinHistory, kept as is, but can add weeks if needed in call.)

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
    sadness: number;
    energy: number;
    logged_at: string;
}

export interface VoicePromptData {
    mood_category: string;
    mood_score: number;
    prompt_name: string;
    system_prompt: string;
    suggested_duration: string;
    follow_up_recommended: boolean;
    calculated_at: string;
}

export interface MoodAnalysisResponse {
    mood_score: number;
    stress: number;
    anxiety: number;
    sadness: number;
    energy: number;
    logged_at: string;
}

// API Service Functions

// --- Detect / Skin API ---

export interface UserSkinImage {
    image_id: string;
    image_url: string;       // now "/uploads/skin_images/xxx.jpg"
    captured_at: string;
    image_type: string;
}

export const getMySkinImages = async (): Promise<UserSkinImage[]> => {
    const response = await api.get('/skin/my-images');
    return response.data;
};

export const uploadSkinImage = async (file: File, userId: string = "test-user", imageType: string = "weekly"): Promise<SkinImageUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

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

export const analyzeExisting = async (imageId: string) => {
    const response = await api.post(`/skin/analyze/${imageId}`);
    return response.data;
};

export const compareImages = async (beforeImageId: string, afterImageId: string) => {
    const response = await api.post('/skin/compare', {
        before_image_id: beforeImageId,
        after_image_id: afterImageId
    });
    return response.data;
};

export const getSkinHistory = async (userId: string) => {
    const response = await api.get(`/skin/progress/${userId}/comparison`);
    return response.data;
};

export const deleteImage = async (imageId: string) => {
    const response = await api.delete(`/skin/image/${imageId}`);
    return response.data;
};

export const getImprovementTracker = async (userId: string) => {
    return (await api.get(`/skin/improvement-tracker/${userId}`)).data;
};

export const refreshImprovement = async (userId: string) => {
    const response = await api.post(`/skin/improvement-tracker/${userId}/refresh`);
    return response.data;
};


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

export const uploadVoiceForMoodAnalysis = async (
    userId: string,
    audioBlob: Blob
): Promise<MoodAnalysisResponse> => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'conversation.webm');

    const response = await api.post(`/voice/mood/analyze`, formData, {
        params: { user_id: userId },
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    
    return response.data;
};

// --- Reports API ---
export const getWeeklyReport = async (userId: string) => {
    const response = await api.get(`/reports/weekly/${userId}`);
    return response.data;
}

export default api;
