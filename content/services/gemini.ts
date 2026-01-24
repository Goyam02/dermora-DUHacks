import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
// NOTE: In production, this keys should be backend-proxied or in env variables.
const API_KEY = "AIzaSyBIYrXy4TVH7TSHrOVqua1WeX1nnHjqY_Y";
const genAI = new GoogleGenerativeAI(API_KEY);

export const getGeminiStream = async function* (userText: string, systemPrompt: string) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const result = await model.generateContentStream({
            contents: [
                { role: "model", parts: [{ text: systemPrompt }] },
                { role: "user", parts: [{ text: userText }] }
            ],
            generationConfig: {
                maxOutputTokens: 150, // Allow slightly more for conversation
                temperature: 0.7,
            }
        });

        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) yield chunkText;
        }

    } catch (error) {
        console.error("Gemini Stream Error:", error);
        throw error;
    }
};

export const getGeminiResponse = async (userText: string, systemPrompt: string) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const result = await model.generateContent({
            contents: [
                { role: "model", parts: [{ text: systemPrompt }] },
                { role: "user", parts: [{ text: userText }] }
            ],
            generationConfig: {
                maxOutputTokens: 100,
                temperature: 0.7,
            }
        });

        return result.response.text();
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "I'm having trouble connecting.";
    }
};

// Helper to convert File to GenerativePart
async function fileToGenerativePart(file: File): Promise<{ inlineData: { data: string; mimeType: string } }> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64Data = reader.result as string;
            const base64Content = base64Data.split(',')[1];
            resolve({
                inlineData: {
                    data: base64Content,
                    mimeType: file.type
                },
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export const analyzeSkinWithGemini = async (file: File) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const imagePart = await fileToGenerativePart(file);

        const prompt = `
        Analyze this image of a skin condition. 
        Provide a JSON response with the following fields: 
        1. prediction (name of the potential condition or 'Normal')
        2. confidence (a number between 0 and 1)
        3. severity_score (0-100)
        4. message (a brief, empathetic explanation and advice)
        
        Strictly return ONLY the JSON string. Do not include markdown formatting like \`\`\`json.
        `;

        const result = await model.generateContent([prompt, imagePart]);
        const responseText = result.response.text();
        const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanText);

    } catch (error) {
        console.error("Gemini Vision Error:", error);
        throw new Error("Analysis unavailable.");
    }
}
