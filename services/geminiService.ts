
import { GoogleGenAI } from "@google/genai";

/**
 * Fetches a concise insight for a given channel using Gemini 3 Flash.
 * Adheres to guidelines: creates instance right before use, uses process.env.API_KEY.
 */
export const getChannelInsight = async (channelName: string, group: string): Promise<string> => {
  // Always create a new instance right before use to ensure the most up-to-date API key is used
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide a short, 2-sentence description of an IPTV channel named "${channelName}" which is in the category "${group}". Be concise and professional.`,
    });
    
    // Using response.text property as per guidelines (not a method)
    return response.text || "No insights available for this signal.";
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return "The AI assistant is currently recalibrating. Please try again later.";
  }
};

/**
 * Recommends channels based on a user query.
 */
export const getRecommendations = async (query: string, availableChannels: string[]): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `The user is looking for: "${query}". Based on this list of available channel names: [${availableChannels.slice(0, 100).join(', ')}...], which 5 would you recommend? Return only a comma-separated list of the channel names.`,
    });
    
    // Accessing .text as a property, as per Correct Method guidelines
    const text = response.text || "";
    return text.split(',').map(s => s.trim()).filter(s => s.length > 0);
  } catch (error) {
    console.error("Gemini Recommendation Error:", error);
    return [];
  }
};
