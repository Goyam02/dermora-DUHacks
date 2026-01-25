import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

// Base config (shared)
const BASE_URL = 'http://localhost:8000';

// ──────────────────────────────────────────────────────────────────────────────
// Factory to create auth-aware axios instance with X-User-Id header
// Usage in component: const api = createApi(await getToken(), userId);
// ──────────────────────────────────────────────────────────────────────────────
export const createApi = (token?: string, userId?: string): AxiosInstance => {
    const instance = axios.create({
        baseURL: BASE_URL,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...(userId && { 'X-User-Id': userId }),
        },
    });

    // Optional: Add response interceptor for common error handling
    instance.interceptors.response.use(
        (response) => response,
        (error) => {
            console.error('API Error:', {
                url: error.config?.url,
                status: error.response?.status,
                data: error.response?.data,
                message: error.message,
            });
            return Promise.reject(error);
        }
    );

    return instance;
};

// ──────────────────────────────────────────────────────────────────────────────
// Default public instance (no token) - use only for truly public endpoints
// ──────────────────────────────────────────────────────────────────────────────
export const api = createApi(); // No auth by default

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export interface SkinAnalysisResult {
    prediction: string;
    confidence: number;
    severity_score?: number;
}

export interface SkinImageUploadResponse {
    image_id: string;
    image_url: string;
    prediction: string;
    confidence: number;
    captured_at: string;
    message: string;
}

export interface UserSkinImage {
    image_id: string;
    image_url: string;
    captured_at: string;
    image_type: string;
}

export interface MoodLogData {
    mood_score: number;
    stress: number;
    anxiety: number;
    sadness: number;
    energy: number;
    logged_at: string;
}

export interface MoodLog {
    mood_log_id: string;
    mood_score: number;
    stress: number;
    anxiety: number;
    energy: number;
    logged_at: string;
}

export interface MoodHistoryResponse {
    total_logs: number;
    logs: MoodLog[];
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

// ──────────────────────────────────────────────────────────────────────────────
// Engagement Types (NEW)
// ──────────────────────────────────────────────────────────────────────────────

export interface StreakData {
    current_streak: number;
    longest_streak: number;
    last_check_in: string | null;
    can_check_in_today: boolean;
}

export interface DashboardData {
    streak: StreakData;
    quick_stats: {
        images_this_week: number;
        mood_avg_this_week: number | null;
        days_active_this_month: number;
    };
    recent_activity: Array<{
        type: 'skin' | 'mood' | 'voice';
        description: string;
        timestamp: string;
    }>;
}

export interface DailyInsight {
    message: string;
    insight_type: string;
    generated_at: string;
}

export interface MoodChartData {
    date: string;
    mood_score: number;
    stress: number;
    anxiety: number;
    energy: number;
}

export interface MoodSummary {
    total_logs: number;
    avg_mood: number | null;
    avg_stress: number | null;
    avg_anxiety: number | null;
    avg_energy: number | null;
    period_days: number;
}

export interface UserPreferences {
    notification_time: string | null;
    daily_reminder: boolean;
    weekly_report: boolean;
    voice_prompt_frequency: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Skin API (requires X-User-Id header)
// ──────────────────────────────────────────────────────────────────────────────

export const getMySkinImages = async (token?: string, userId?: string): Promise<UserSkinImage[]> => {
    const apiInstance = createApi(token, userId);
    const response = await apiInstance.get('/skin/my-images');
    return response.data;
};

export const uploadSkinImage = async (
    file: File,
    imageType: string = "weekly",
    token?: string,
    userId?: string
): Promise<SkinImageUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const apiInstance = createApi(token, userId);
    const response = await apiInstance.post('/skin/upload', formData, {
        params: { image_type: imageType },
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};

export const analyzeExisting = async (
    imageId: string,
    token?: string,
    userId?: string
) => {
    const apiInstance = createApi(token, userId);
    const response = await apiInstance.post(`/skin/analyze/${imageId}`);
    return response.data;
};

export const compareImages = async (
    beforeImageId: string,
    afterImageId: string,
    token?: string,
    userId?: string
) => {
    const apiInstance = createApi(token, userId);
    const response = await apiInstance.post('/skin/compare', {
        before_image_id: beforeImageId,
        after_image_id: afterImageId,
    });
    return response.data;
};

export const getSkinHistory = async (token?: string, userId?: string) => {
    const apiInstance = createApi(token, userId);
    const response = await apiInstance.get('/skin/progress/comparison');
    return response.data;
};

export const deleteImage = async (imageId: string, token?: string, userId?: string) => {
    const apiInstance = createApi(token, userId);
    const response = await apiInstance.delete(`/skin/image/${imageId}`);
    return response.data;
};

export const getImprovementTracker = async (token?: string, userId?: string) => {
    const apiInstance = createApi(token, userId);
    const response = await apiInstance.get('/skin/improvement-tracker');
    return response.data;
};

export const refreshImprovement = async (token?: string, userId?: string) => {
    const apiInstance = createApi(token, userId);
    const response = await apiInstance.post('/skin/improvement-tracker/refresh');
    return response.data;
};

// ──────────────────────────────────────────────────────────────────────────────
// Mood API (requires X-User-Id header for authenticated endpoints)
// ──────────────────────────────────────────────────────────────────────────────

export const logMood = async (data: MoodLogData, token?: string, userId?: string) => {
    const apiInstance = createApi(token, userId);
    const response = await apiInstance.post('/mood/log', data);
    return response.data;
};

export const getMoodQuestions = async () => {
    // Public endpoint - no auth required
    const apiInstance = createApi();
    const response = await apiInstance.get('/mood/questions');
    return response.data;
};

export const getMoodHistory = async (limit: number = 30, token?: string, userId?: string): Promise<MoodHistoryResponse> => {
    const apiInstance = createApi(token, userId);
    const response = await apiInstance.get('/mood/history', {
        params: { limit },
    });
    return response.data;
};

export const deleteMoodLog = async (moodLogId: string, token?: string, userId?: string) => {
    const apiInstance = createApi(token, userId);
    const response = await apiInstance.delete(`/mood/log/${moodLogId}`);
    return response.data;
};

// ──────────────────────────────────────────────────────────────────────────────
// Voice / Solace API (requires X-User-Id header)
// ──────────────────────────────────────────────────────────────────────────────

export const getVoicePrompt = async (token?: string, userId?: string): Promise<VoicePromptData> => {
    const apiInstance = createApi(token, userId);
    const response = await apiInstance.get('/voice/prompt');
    return response.data;
};

export const uploadVoiceForMoodAnalysis = async (
    audioBlob: Blob,
    token?: string,
    userId?: string
): Promise<MoodAnalysisResponse> => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'conversation.webm');

    const apiInstance = createApi(token, userId);
    const response = await apiInstance.post('/voice/mood/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};

// ──────────────────────────────────────────────────────────────────────────────
// Reports API (requires X-User-Id header)
// ──────────────────────────────────────────────────────────────────────────────

export const getWeeklyReport = async (token?: string, userId?: string) => {
    const apiInstance = createApi(token, userId);
    const response = await apiInstance.get('/reports/weekly');
    return response.data;
};

export const getWeeklyReportHtml = async (token?: string, userId?: string) => {
    const apiInstance = createApi(token, userId);
    const response = await apiInstance.get('/reports/weekly/html', {
        responseType: 'text',
    });
    return response.data;
};

export const getWeeklyReportsList = async (limit: number = 10, token?: string, userId?: string) => {
    const apiInstance = createApi(token, userId);
    const response = await apiInstance.get('/reports/weekly/list', {
        params: { limit },
    });
    return response.data;
};

export const deleteWeeklyReport = async (reportId: string, token?: string, userId?: string) => {
    const apiInstance = createApi(token, userId);
    const response = await apiInstance.delete(`/reports/weekly/${reportId}`);
    return response.data;
};

// ──────────────────────────────────────────────────────────────────────────────
// Engagement API (NEW - requires X-User-Id header)
// ──────────────────────────────────────────────────────────────────────────────

export const getStreak = async (token?: string, userId?: string): Promise<StreakData> => {
    const apiInstance = createApi(token, userId);
    const response = await apiInstance.get('/engagement/streak');
    return response.data;
};

export const dailyCheckIn = async (token?: string, userId?: string) => {
    const apiInstance = createApi(token, userId);
    const response = await apiInstance.post('/engagement/check-in');
    return response.data;
};

export const getDashboard = async (token?: string, userId?: string): Promise<DashboardData> => {
    const apiInstance = createApi(token, userId);
    const response = await apiInstance.get('/engagement/dashboard');
    return response.data;
};

export const getDailyInsight = async (token?: string, userId?: string): Promise<DailyInsight> => {
    const apiInstance = createApi(token, userId);
    const response = await apiInstance.get('/engagement/insights/daily');
    return response.data;
};

export const getMoodHistoryChart = async (days: number = 7, token?: string, userId?: string): Promise<MoodChartData[]> => {
    const apiInstance = createApi(token, userId);
    const response = await apiInstance.get('/engagement/mood/history', {
        params: { days },
    });
    return response.data;
};

export const getMoodSummary = async (token?: string, userId?: string): Promise<MoodSummary> => {
    const apiInstance = createApi(token, userId);
    const response = await apiInstance.get('/engagement/mood/summary');
    return response.data;
};

export const getPreferences = async (token?: string, userId?: string): Promise<UserPreferences> => {
    const apiInstance = createApi(token, userId);
    const response = await apiInstance.get('/engagement/preferences');
    return response.data;
};

export const updatePreferences = async (prefs: Partial<UserPreferences>, token?: string, userId?: string): Promise<UserPreferences> => {
    const apiInstance = createApi(token, userId);
    const response = await apiInstance.put('/engagement/preferences', prefs);
    return response.data;
};

export default api; // Export default public instance (no auth)