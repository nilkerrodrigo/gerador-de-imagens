import { GoogleGenAI } from "@google/genai";
import { AppState } from "../types";

// Helper para inicializar o cliente com a chave correta (Environment Variables)
const getAiClient = () => {
  let apiKey = '';
  try {
    // Vite substitui process.env.API_KEY por uma string durante o build.
    // Se estiver rodando sem build, process pode não existir.
    if (typeof process !== 'undefined' && process.env) {
         apiKey = process.env.API_KEY || '';
    } else {
        // Fallback para substituição direta do Vite
        apiKey = process.env.API_KEY || ''; 
    }
  } catch (e) {
     // Ignora ReferenceError se process não existir
  }

  if (!apiKey || apiKey === "undefined" || apiKey.trim() === '') {
    throw new Error("ERRO: API Key ausente. Configure no painel de hospedagem (Environment Variables).");
  }
  return new GoogleGenAI({ apiKey });
};

// --- RETRY LOGIC HELPER ---
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function retryOperation<T>(operation: () => Promise<T>, retries = 1, delayMs = 2000): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      const msg = error.message || '';
      
      // Verifica ERRO DE CHAVE VAZADA ou INVÁLIDA
      const isLeakedKey = error.status === 403 || 
                          msg.includes('leaked') || 
                          msg.includes('key was reported as leaked') ||
                          msg.includes('API key not valid');

      if (isLeakedKey) {
          throw new Error("CHAVE BLOQUEADA: Sua API Key foi revogada pelo Google por segurança.");
      }

      // Verifica COTA EXCEDIDA (429)
      const isQuotaError = error.status === 429 || 
                           msg.includes('429') || 
                           msg.includes('quota') || 
                           msg.includes('RESOURCE_EXHAUSTED');
      
      if (isQuotaError) {
         if (i === retries) {
             throw new Error("LIMITE GRATUITO ATINGIDO (429): O Google pausou suas gerações temporariamente. Solução: Aguarde alguns minutos.");
         }
         console.warn(`Cota atingida (429). Tentando novamente em ${delayMs}ms...`);
         await wait(delayMs);
         continue;
      }
      
      // Se for a última tentativa, lança o erro
      if (i === retries) throw error;
      
      await wait(delayMs);
    }
  }
  throw new Error("Falha desconhecida na operação.");
}

// Helper robusto para garantir proporções aceitas pela API
const getAspectRatioForApi = (formatValue: string): string => {
  if (formatValue === "1:1") return "1:1";
  if (formatValue === "16:9") return "16:9";
  if (formatValue === "9:16") return "9:16";
  if (formatValue === "4:5") return "3:4"; // Aproximação da API
  if (formatValue === "2:1") return "16:9"; // Aproximação da API
  if (formatValue.includes("16:9")) return "16:9";
  if (formatValue.includes("9:16")) return "9:16";
  if (formatValue.includes("Portrait")) return "3:4";
  return "1:1"; 
};

const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIMENSION = 1024; 
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_DIMENSION) {
            height *= MAX_DIMENSION / width;
            width = MAX_DIMENSION;
          }
        } else {
          if (height > MAX_DIMENSION) {
            width *= MAX_DIMENSION / height;
            height = MAX_DIMENSION;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error("Falha ao obter contexto")); return; }
        ctx.drawImage(img, 0, 0, width, height);
        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataURL = canvas.toDataURL(mimeType, 0.9);
        resolve({ inlineData: { data: dataURL.split(',')[1], mimeType: mimeType } });
      };
      img.onerror = () => reject(new Error("Falha ao processar imagem."));
    };
    reader.onerror = () => reject(new Error("Falha ao ler arquivo."));
    reader.readAsDataURL(file);
  });
};

export const enhancePrompt = async (desc: string, cat: string, style: string): Promise<string> => {
    const ai = getAiClient();
    const prompt = `Rewrite this for image generation: "${desc}". Category: ${cat}, Style: ${style}. Detailed, concise.`;
    return retryOperation(async () => {
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        return response.text ? response.text.trim() : desc;
    });
};

export const generateSocialCaption = async (imageBase64: string, niche: string, objective: string): Promise<string> => {
    const ai = getAiClient();
    const cleanBase64 = imageBase64.split(',')[1] || imageBase64;
    const prompt = `Write a PT-BR Instagram caption for this image. Niche: ${niche}, Goal: ${objective}. Engaging, with CTA and hashtags.`;
    return retryOperation(async () => {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ inlineData: { data: cleanBase64, mimeType: 'image/jpeg' } }, { text: prompt }] }
        });
        return response.text || "Erro na legenda.";
    });
};

export const analyzeBrandAssets = async (files: File[]): Promise<{ palette: string; style: string; nicheSuggestion: string }> => {
    const ai = getAiClient();
    const parts: any[] = await Promise.all(files.map(file => fileToGenerativePart(file)));
    parts.push({ text: `Analyze brand. Output JSON: { "palette": "colors", "style": "one of [Cinematic, Minimalist, etc]", "niche": "industry" }` });
    return retryOperation(async () => {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts },
            config: { responseMimeType: 'application/json' }
        });
        const json = JSON.parse(response.text?.replace(/```json/g, '').replace(/```/g, '').trim() || "{}");
        return { palette: json.palette || "", style: json.style || "Cinematic", nicheSuggestion: json.niche || "" };
    });
};

export const generateCreatives = async (state: AppState): Promise<string[]> => {
  try {
    const ai = getAiClient();
    
    let promptText = `Create a "${state.category}" image. Style: ${state.style}. Mood: ${state.mood}. Niche: ${state.niche}. Palette: ${state.colorPalette}. \nDescription: ${state.description}. \nText to render: "${state.textOnImage}". ${state.showCta ? `CTA: "${state.ctaText}"` : ''}. Ratio: ${state.format}.`;
    
    if (state.negativePrompt) promptText += `\nAvoid: ${state.negativePrompt}`;
    
    let parts: any[] = [];
    if (state.logoImage) {
        parts.push(await fileToGenerativePart(state.logoImage));
        promptText += "\nInsert logo (Input #1) discretely.";
    }
    if (state.referenceImages.length > 0) {
        const refParts = await Promise.all(state.referenceImages.map(f => fileToGenerativePart(f)));
        parts.push(...refParts);
        promptText += `\nUse Inputs as style reference.`;
    }
    parts.push({ text: promptText });

    const generatedImages: string[] = [];
    const aspectRatioApi = getAspectRatioForApi(state.format);

    // IMPORTANTE: Se o usuário não definiu count, usa 1 para economizar
    const count = state.modelCount || 1;

    await retryOperation(async () => {
        generatedImages.length = 0;
        for (let i = 0; i < count; i++) {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image', 
                contents: { parts },
                config: { imageConfig: { aspectRatio: aspectRatioApi } }
            });
            
            let found = false;
            response.candidates?.[0]?.content?.parts?.forEach(p => {
                if (p.inlineData) {
                    generatedImages.push(`data:${p.inlineData.mimeType};base64,${p.inlineData.data}`);
                    found = true;
                }
            });
            if (!found) throw new Error("A IA processou o pedido mas não retornou imagem válida. Tente simplificar o prompt.");
        }
    }, 0); // 0 retries para evitar loops infinitos em caso de erro fatal

    return generatedImages;

  } catch (error: any) {
    console.error("Erro Generation:", error);
    throw error;
  }
};