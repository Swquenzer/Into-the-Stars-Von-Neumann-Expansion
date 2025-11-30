import { GoogleGenAI } from "@google/genai";
import { SolarSystem } from "../types";

// Lazy initialization to avoid errors when API key is missing
let ai: GoogleGenAI | null = null;

const getAI = () => {
  if (!ai && process.env.API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return ai;
};

export const generateSystemLore = async (system: SolarSystem): Promise<string> => {
  if (!process.env.API_KEY) {
    return "Sensors offline. Configure API_KEY to analyze signal.";
  }

  const metalLevel = system.resources.Metal > 70 ? "rich" : system.resources.Metal > 30 ? "moderate" : "poor";
  const plutoniumLevel = system.resources.Plutonium > 70 ? "rich" : system.resources.Plutonium > 30 ? "moderate" : "poor";

  const aiInstance = getAI();
  if (!aiInstance) {
    return "Sensors offline. Configure API_KEY to analyze signal.";
  }

  try {
    const response = await aiInstance.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a short, scientific but atmospheric one-sentence log entry (max 20 words) for a probe arriving at a solar system named ${system.name}. 
      The system is ${metalLevel} in metals and ${plutoniumLevel} in radioactive isotopes.`,
    });
    
    return response.text || "No data available.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Communication error with central archives.";
  }
};

export const generateProbeName = async (model: string): Promise<string> => {
    const aiInstance = getAI();
    if (!aiInstance) return `Unit-${Math.floor(Math.random() * 9000) + 1000}`;
    
    try {
        const response = await aiInstance.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate a single cool, sci-fi code name for a ${model} space probe. Just the name, no text.`,
        });
        const text = response.text;
        return text ? text.trim() : `Unit-${Math.floor(Math.random() * 9000) + 1000}`;
    } catch (e) {
        return `Unit-${Math.floor(Math.random() * 9000) + 1000}`;
    }
}