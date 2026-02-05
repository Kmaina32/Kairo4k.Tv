import { GoogleGenAI } from "@google/genai";

const getAIInstance = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("Gemini API Key is missing. AI features will be limited.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const getChannelInsight = async (channelName: string, group: string) => {
  const ai = getAIInstance();
  if (!ai) return "AI services are currently offline.";
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide a short, 2-sentence description of an IPTV channel named "${channelName}" which is in the category "${group}". Be concise and professional.`,
    });
    return response.text || "No insights available.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "The AI assistant is recharging. Please try again later.";
  }
};

export const getRecommendations = async (query: string, availableChannels: string[]) => {
  const ai = getAIInstance();
  if (!ai) return [];
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `The user is looking for: "${query}". Based on this list of available channel names: [${availableChannels.slice(0, 100).join(', ')}...], which 5 would you recommend? Return only a comma-separated list of the channel names.`,
    });
    return response.text?.split(',').map(s => s.trim()) || [];
  } catch (error) {
    console.error("Gemini Recommendation Error:", error);
    return [];
  }
};