
import { GoogleGenAI, Modality } from "@google/genai";

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export async function editImage(
  base64ImageData: string,
  mimeType: string,
  prompt: string
): Promise<string | null> {
  const model = 'gemini-2.5-flash-image';
  
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64ImageData,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return part.inlineData.data;
        }
      }
    return null;
  } catch (error) {
    console.error(`Error editing image with ${model}:`, error);
    throw new Error(`Failed to edit image. ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function generateSpeech(text: string): Promise<string | null> {
    const model = 'gemini-2.5-flash-preview-tts';

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: [{ parts: [{ text: text }] }],
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Kore' }, // A friendly, clear voice
                  },
              },
            },
          });
          
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        return base64Audio || null;
    } catch (error) {
        console.error(`Error generating speech with ${model}:`, error);
        throw new Error(`Failed to generate speech. ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
