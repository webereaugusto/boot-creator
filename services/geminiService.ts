import { GoogleGenAI } from "@google/genai";

// We use Gemini to help the user write the chatbot's system instructions
export const generateBotPersona = async (description: string): Promise<string> => {
  if (!process.env.API_KEY) {
    return "Error: No Gemini API Key found in environment. Please check metadata.json.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Create a detailed system instruction (role definition) for a chatbot based on this description: "${description}". 
      The output should be a direct system prompt, concise but comprehensive. Do not include markdown code blocks, just the text.`,
    });
    
    return response.text || "Failed to generate persona.";
  } catch (error) {
    console.error("Gemini generation error:", error);
    return "Error generating persona. Please try again.";
  }
};

// This function simulates the "Widget" chat response.
// In a real scenario, the "OpenAI Key" entered by the user would be sent to a secure backend proxy.
// Here, we simulate the response using Gemini to demonstrate a working chat in the preview.
export const simulateChatResponse = async (
  history: { role: string; content: string }[],
  systemInstruction: string,
  knowledgeBase: string
): Promise<string> => {
  if (!process.env.API_KEY) {
    return "System: Gemini API Key missing. Cannot simulate response.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const systemPrompt = `
      You are a custom chatbot.
      ROLE DEFINITION: ${systemInstruction}
      
      KNOWLEDGE BASE:
      ${knowledgeBase}
      
      Strictly adhere to the role and knowledge base.
    `;

    // Map history to Gemini format if needed, or just pass as text context for simplicity in this simulation
    // Ideally, we use history properly.
    // Since Gemini 2.5 Flash is robust, we can pass a structured prompt.
    
    const conversationText = history.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
    const prompt = `${systemPrompt}\n\nCONVERSATION HISTORY:\n${conversationText}\n\nASSISTANT:`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "...";
  } catch (error) {
    return "Error: Could not connect to simulation engine.";
  }
};