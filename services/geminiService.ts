
import { GoogleGenAI } from "@google/genai";

// Fix: Use process.env.API_KEY directly as per guidelines for initialization
export const getChannelInsight = async (channelName: string, group: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide a short, 2-sentence description of an IPTV channel named "${channelName}" which is in the category "${group}". If you don't know the specific channel, give a general idea of what content usually appears in this category. Be concise and professional.`,
    });
    
    // Use the .text property directly (not a method)
    return response.text || "No insights available for this channel.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "The AI assistant is currently resting. Please try again later.";
  }
};

export const getRecommendations = async (query: string, availableChannels: string[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `The user is looking for: "${query}". Based on this list of available channel names: [${availableChannels.slice(0, 100).join(', ')}...], which 5 would you recommend? Return only a comma-separated list of the channel names.`,
    });
    
    // Access response.text to retrieve the content string
    return response.text?.split(',').map(s => s.trim()) || [];
  } catch (error) {
    console.error("Gemini Recommendation Error:", error);
    return [];
  }
};
