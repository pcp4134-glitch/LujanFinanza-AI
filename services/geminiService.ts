import { GoogleGenAI, Type, Modality, LiveServerMessage } from "@google/genai";
import { Transaction, ImageSize } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });

// Helper to encode image to base64
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// --- Financial Analysis & Receipt Scanning ---

export const analyzeReceipt = async (base64Image: string): Promise<Partial<Transaction>> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          { text: "Extract: Total Amount (number), Date (YYYY-MM-DD), Description, Type (INCOME/EXPENSE). Return JSON." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER },
            date: { type: Type.STRING },
            description: { type: Type.STRING },
            type: { type: Type.STRING, enum: ["INCOME", "EXPENSE"] }
          }
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Receipt analysis failed:", error);
    throw error;
  }
};

export const getFinancialAdvice = async (query: string, transactions: Transaction[]): Promise<string> => {
  const dataSummary = JSON.stringify(transactions.slice(-50));
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Context: ${dataSummary}. User Query: ${query}. Analyze deeply.`,
      config: {
        thinkingConfig: { thinkingBudget: 32768 } // Max thinking budget
      }
    });
    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Financial advice failed:", error);
    return "Service unavailable.";
  }
};

// --- Chat & Search ---

export const chatWithSearch = async (query: string): Promise<{text: string, sources?: any[]}> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: query,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    
    return {
      text: response.text || "No info found.",
      sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks
    };
  } catch (error) {
    console.error("Search failed:", error);
    throw error;
  }
};

export const fastChat = async (query: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: query
    });
    return response.text || "";
  } catch (error) {
    console.error("Fast chat failed:", error);
    throw error;
  }
};

// --- Image Generation & Editing ---

export const generateEducationImage = async (prompt: string, size: ImageSize): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: {
          imageSize: size,
          aspectRatio: "16:9"
        }
      }
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Image gen failed:", error);
    throw error;
  }
};

export const editImage = async (base64Image: string, prompt: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/png', data: base64Image } },
          { text: prompt }
        ]
      }
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Image edit failed:", error);
    throw error;
  }
};

// --- Audio / TTS / Live ---

export const generateAudioSummary = async (text: string): Promise<ArrayBuffer | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: { parts: [{ text }] },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }
        }
      }
    });
    
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
    }
    return null;
  } catch (error) {
    console.error("TTS failed:", error);
    return null;
  }
};

// --- Live API Helpers ---

// Audio encoding helpers for Live API
function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return output.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export const connectLiveSession = async (
  onAudioData: (buffer: ArrayBuffer) => void,
  onClose: () => void
) => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);
  
  source.connect(processor);
  processor.connect(audioContext.destination);

  let sessionPromise = ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
    callbacks: {
      onopen: () => console.log('Live session opened'),
      onmessage: async (msg: LiveServerMessage) => {
        const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
        if (audioData) {
          onAudioData(base64ToArrayBuffer(audioData));
        }
      },
      onclose: () => onClose(),
      onerror: (e) => console.error('Live session error', e)
    },
    config: {
      responseModalities: [Modality.AUDIO],
      systemInstruction: "You are a helpful financial assistant for school administrators.",
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
      }
    }
  });

  // Send audio input
  processor.onaudioprocess = async (e) => {
    const inputData = e.inputBuffer.getChannelData(0);
    const pcmData = floatTo16BitPCM(inputData);
    const base64Data = arrayBufferToBase64(pcmData);
    
    (await sessionPromise).sendRealtimeInput({
      media: {
        mimeType: 'audio/pcm;rate=16000',
        data: base64Data
      }
    });
  };

  return {
    disconnect: async () => {
      source.disconnect();
      processor.disconnect();
      audioContext.close();
      stream.getTracks().forEach(track => track.stop());
      (await sessionPromise).disconnect();
    }
  };
};
