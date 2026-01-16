import { GoogleGenAI } from "@google/genai";
import { AppState } from "../types";

// Helper para inicializar o cliente com a chave correta (Custom ou Env)
const getAiClient = (customKey?: string) => {
  const apiKey = customKey && customKey.trim() !== "" ? customKey : process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key não encontrada. Configure o .env ou insira sua chave nas configurações.");
  }
  return new GoogleGenAI({ apiKey });
};

// --- RETRY LOGIC HELPER ---
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function retryOperation<T>(operation: () => Promise<T>, retries = 3, delayMs = 2000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      // Verifica erros de cota (429) ou sobrecarga
      const isQuotaError = error.status === 429 || 
                           error.message?.includes('429') || 
                           error.message?.includes('quota') || 
                           error.message?.includes('RESOURCE_EXHAUSTED');
      
      const isOverloaded = error.status === 503 || error.message?.includes('503');

      if ((isQuotaError || isOverloaded) && i < retries - 1) {
        const waitTime = delayMs * Math.pow(2, i); // Backoff exponencial: 2s, 4s, 8s
        console.warn(`Tentativa ${i + 1} falhou (Erro ${error.status}). Aguardando ${waitTime}ms...`);
        await wait(waitTime);
        continue;
      }

      // Se for a última tentativa e for erro de cota, lança mensagem amigável
      if (isQuotaError) {
         throw new Error("Cota Gratuita Excedida. A API do Google bloqueou temporariamente. Aguarde alguns minutos ou insira uma Chave Paga nas configurações.");
      }
      
      throw error;
    }
  }
  throw new Error("Falha na operação após várias tentativas.");
}

// Helper robusto para garantir proporções aceitas pela API
const getAspectRatioForApi = (formatValue: string): string => {
  // A API do Gemini suporta estritamente: "1:1", "3:4", "4:3", "9:16", "16:9"
  if (formatValue === "1:1") return "1:1";
  if (formatValue === "16:9") return "16:9";
  if (formatValue === "9:16") return "9:16";
  
  // Mapeamentos de aproximação para formatos não nativos
  if (formatValue === "4:5") return "3:4"; // 3:4 é o mais próximo de 4:5 (vertical)
  if (formatValue === "2:1") return "16:9"; // 16:9 é o mais próximo de banner wide
  
  // Fallbacks baseados em string caso o value venha diferente
  if (formatValue.includes("16:9")) return "16:9";
  if (formatValue.includes("9:16")) return "9:16";
  if (formatValue.includes("Portrait")) return "3:4";
  
  return "1:1"; // Default seguro
};

// Helper to resize and convert file to base64
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
        
        if (!ctx) {
            reject(new Error("Falha ao obter contexto do canvas"));
            return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Use PNG for logos to preserve transparency if possible, otherwise JPEG
        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataURL = canvas.toDataURL(mimeType, 0.9);
        const base64Data = dataURL.split(',')[1];
        
        resolve({
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          }
        });
      };
      
      img.onerror = () => reject(new Error("Falha ao processar imagem para envio."));
    };
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo."));
    reader.readAsDataURL(file);
  });
};

// --- FUNÇÃO: PROMPT MÁGICO ---
export const enhancePrompt = async (
    currentDescription: string, 
    category: string, 
    style: string,
    apiKey?: string
): Promise<string> => {
    const ai = getAiClient(apiKey);
    
    const prompt = `
    ACT AS A PROFESSIONAL PROMPT ENGINEER.
    Rewrite the following simple description into a detailed, high-quality image generation prompt.
    
    CONTEXT:
    - User Input: "${currentDescription}"
    - Category: ${category}
    - Desired Style: ${style}

    INSTRUCTIONS:
    - Add details about lighting, camera angle, texture, and mood.
    - Keep it concise but descriptive (approx 40-60 words).
    - Ensure it fits the selected Style.
    - Output ONLY the rewritten prompt text. No "Here is the prompt" prefix.
    `;

    return retryOperation(async () => {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt
        });
        return response.text ? response.text.trim() : currentDescription;
    });
};

// --- FUNÇÃO: GERAR LEGENDA (COPYWRITING) ---
export const generateSocialCaption = async (
    imageBase64: string, 
    niche: string, 
    objective: string,
    apiKey?: string
): Promise<string> => {
    const ai = getAiClient(apiKey);
    
    const cleanBase64 = imageBase64.split(',')[1] || imageBase64;

    const prompt = `
    You are a Social Media Manager Expert.
    
    TASK: Write a captivating Instagram caption for this image.
    CONTEXT:
    - Niche: ${niche}
    - Goal: ${objective}
    
    INSTRUCTIONS:
    - Write in Portuguese (Brazil).
    - Use an engaging tone suitable for the niche.
    - Start with a strong hook.
    - Include a Call to Action (CTA) at the end.
    - Add 5-10 relevant and trending hashtags.
    - Keep it concise (under 100 words).
    `;

    return retryOperation(async () => {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { inlineData: { data: cleanBase64, mimeType: 'image/jpeg' } },
                    { text: prompt }
                ]
            }
        });
        return response.text || "Não foi possível gerar a legenda.";
    });
};

// --- FUNÇÃO: CONSULTOR DE MARCA ---
export const analyzeBrandAssets = async (
    files: File[],
    apiKey?: string
): Promise<{ palette: string; style: string; nicheSuggestion: string }> => {
    const ai = getAiClient(apiKey);
    const parts: any[] = await Promise.all(files.map(file => fileToGenerativePart(file)));
    
    const prompt = `
    You are a Brand Identity Expert. Analyze these images.
    
    TASK: Extract the visual identity.
    
    OUTPUT FORMAT: JSON ONLY (No Markdown, No code blocks).
    Structure:
    {
      "palette": "String describing main hex colors (e.g., #FF0000, #000000) and the mood (e.g., Dark & Neon)",
      "style": "One exact value from this list: ['Ultra Realistic', 'Cinematic', 'Studio Lighting', 'Minimalist', 'Advertising', 'Vibrant Neon', '3D Illustration', 'Corporate Tech']",
      "niche": "A short suggestion for the industry niche based on the images"
    }

    Choose the 'style' that BEST matches the provided images.
    `;
    
    parts.push({ text: prompt });

    return retryOperation(async () => {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts },
            config: { responseMimeType: 'application/json' }
        });
        
        const text = response.text || "{}";
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const json = JSON.parse(cleanText);
        
        return {
            palette: json.palette || "",
            style: json.style || "Cinematic",
            nicheSuggestion: json.niche || ""
        };
    });
};

export const generateCreatives = async (
  state: AppState,
  apiKey?: string
): Promise<string[]> => {
  try {
    const ai = getAiClient(apiKey);

    // --- CONSTRUÇÃO DO PROMPT AVANÇADA ---

    // 1. Definição do Perfil Criativo (Baseado no Estilo)
    let styleInstructions = "";
    switch (state.style) {
        case 'Ultra Realistic': styleInstructions = "Photorealistic, 8k resolution, raw photo, highly detailed textures, raytracing."; break;
        case 'Cinematic': styleInstructions = "Movie scene aesthetics, anamorphic lens flare, shallow depth of field, dramatic lighting, color graded."; break;
        case 'Studio Lighting': styleInstructions = "Professional photography, softbox lighting, clean background, sharp focus, product photography standard."; break;
        case 'Minimalist': styleInstructions = "Clean lines, negative space, simple geometry, pastel or monochromatic tones, clutter-free."; break;
        case 'Advertising': styleInstructions = "High-end commercial look, persuasive, glossy finish, perfect composition for sales, punchy colors."; break;
        case 'Vibrante / Neon': styleInstructions = "Cyberpunk aesthetics, neon lights, high contrast, saturated colors, glowing effects."; break;
        case '3D Illustration': styleInstructions = "Pixar/Disney style or Octane Render, smooth surfaces, cute or stylized characters, soft lighting."; break;
        case 'Corporate Tech': styleInstructions = "Blue and white palette, hex patterns, modern UI elements, trustworthy, professional, abstract data flows."; break;
        default: styleInstructions = "High quality professional design.";
    }

    // 2. Definição da Estrutura (Baseado na Categoria)
    let layoutInstructions = "";
    if (state.category === 'YouTube Thumbnail') {
        layoutInstructions = "Composition rule: Rule of Thirds. High contrast. Facial expressions must be exaggerated if present. Background must be exciting but slightly blurred to pop the subject.";
    } else if (state.category === 'Instagram Post') {
        layoutInstructions = "Aesthetic composition. Balanced visual weight. Lifestyle approach.";
    } else if (state.category === 'Web Banner') {
        layoutInstructions = "Horizontal layout. Leave clear empty space (negative space) on the side for text readability.";
    }

    // 3. Montagem do Prompt Texto
    let promptText = `
ROLE: You are an Elite Digital Artist and Art Director.
TASK: Create a single image for a "${state.category}" campaign.

--- VISUAL IDENTITY & PARAMETERS ---
STYLE ENGINE: ${state.style} (${styleInstructions})
ATMOSPHERE / MOOD: ${state.mood || 'Professional'} (Ensure lighting and colors reflect this emotion).
TARGET AUDIENCE/NICHE: ${state.niche}
${state.category === 'Ad Creative' ? `CAMPAIGN OBJECTIVE: ${state.objective} (Optimize visual elements to achieve this).` : ''}
COLOR PALETTE: ${state.colorPalette ? state.colorPalette : "Harmonious professional palette matching the style."}

--- SCENE DESCRIPTION ---
${state.description}

--- COMPOSITION & ASPECT RATIO ---
Desired Aspect Ratio: ${state.format}
Instructions: Compose the image to fit strictly within a ${state.format} frame. 
${state.format === '4:5' ? 'Ensure the subject is centered vertically with space at top/bottom.' : ''}
${state.format === '2:1' ? 'Create a wide panoramic composition.' : ''}

--- COPYWRITING & TEXT RENDERING (CRITICAL) ---
The image MUST include the following text rendered visibly:
Headline/Text: "${state.textOnImage}"
${state.showCta && state.ctaText ? `CTA Button/Badge: "${state.ctaText}"` : 'NO additional buttons.'}

TEXT PLACEMENT: ${state.textPosition || 'Balanced Composition'}

*** STRICT ORTHOGRAPHY RULES ***
1. PRESERVE DOUBLE LETTERS ("SS"):
   - Words like "Passo", "Sucesso", "Processo", "Isso", "Massa" MUST KEEP THE DOUBLE 'S'.
   - NEVER simplify to single 'S' (e.g. "Paso" is WRONG).
   
2. PRESERVE EQUAL WORDS:
   - If a word appears twice, SPELL IT IDENTICALLY BOTH TIMES.
   - Example: "Passo a Passo" -> BOTH must have "SS".
   - Do NOT write "Passo a Paso".

3. VERBATIM COPY:
   - Render the text EXACTLY as typed in "Headline/Text".
    `;

    // 4. Prompt Negativo (Evitar)
    if (state.negativePrompt) {
        promptText += `
\n--- NEGATIVE PROMPT (AVOID) ---
AVOID THE FOLLOWING: ${state.negativePrompt}, Spanish spelling, Typos, Missing letters, "Paso", "Suceso".
        `;
    }

    // 5. Lógica de Imagens (Logo vs Referência)
    let parts: any[] = [];
    let imageIndexCounter = 1;

    // --- TRATAMENTO DO LOGO ---
    if (state.logoImage) {
        try {
            const logoPart = await fileToGenerativePart(state.logoImage);
            parts.push(logoPart);
            
            promptText += `
\n--- BRANDING ASSETS (CRITICAL) ---
Input Image #${imageIndexCounter} is the BRAND LOGO.
INSTRUCTION: Place this logo into the image as a SMALL, DISCRETE SIGNATURE.

SIZE CONSTRAINT:
- The logo MUST be small (approx. 15% of the image width).
- Do NOT make it giant or dominant. It should not compete with the main subject.

POSITION: 
- Corner (Top-Right or Top-Left) or Bottom-Center.
- Keep it purely 2D (Overlay/Watermark style).

STRICT RULES:
1. Do NOT distort the logo.
2. Do NOT turn it into a 3D object.
3. Maintain high contrast visibility.
            `;
            imageIndexCounter++;
        } catch (e) {
            console.error("Logo processing error", e);
            throw new Error("Erro ao processar o Logo.");
        }
    }

    // --- TRATAMENTO DAS REFERÊNCIAS ---
    if (state.referenceImages && state.referenceImages.length > 0) {
        try {
            const refParts = await Promise.all(state.referenceImages.map(file => fileToGenerativePart(file)));
            parts.push(...refParts);

            const isPlural = state.referenceImages.length > 1;

            promptText += `
\n--- VISUAL REFERENCES ---
Input Image${isPlural ? 's' : ''} #${imageIndexCounter} ${isPlural ? `to #${imageIndexCounter + state.referenceImages.length - 1}` : ''} ${isPlural ? 'are' : 'is a'} VISUAL REFERENCE${isPlural ? 'S' : ''}.
INSTRUCTION: Use the composition, lighting mood, and color grading of ${isPlural ? 'these images' : 'this image'} as a guide.
            `;
            
            if (state.referenceImages.length === 1 && state.description.length < 50) {
                 promptText += `
MODE: IMAGE-TO-IMAGE EDITING.
Keep the main structure of the Reference Image. Only change the text or correct the details requested.
                 `;
            }

        } catch (e) {
            console.error("Image processing error", e);
            throw new Error("Erro ao processar imagens de referência.");
        }
    }

    promptText += `
\n--- FINAL OUTPUT RULES ---
- Layout: ${layoutInstructions}
- Quality: 4k, high resolution, sharp details.
    `;

    parts.push({ text: promptText });

    const generatedImages: string[] = [];
    const aspectRatioApi = getAspectRatioForApi(state.format);

    // Usando Retry Logic para geração de imagem
    await retryOperation(async () => {
        // Se pediu múltiplas imagens, faz loop
        // Nota: O loop está dentro do retry, mas o ideal é retentar a chamada individual. 
        // Simplificação: vamos fazer o loop e se der erro, o retryOperation refaz o loop.
        // CUIDADO: Se já gerou 1 e falhar na 2, o retry vai gerar a 1 de novo. 
        // Para modelos generativos caros/lentos, melhor tratar individualmente, mas aqui simplificamos.
        
        // Reset array se estiver retentando
        generatedImages.length = 0; 

        for (let i = 0; i < state.modelCount; i++) {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: parts
                },
                config: {
                    imageConfig: {
                        aspectRatio: aspectRatioApi 
                    }
                }
            });

            let imageFound = false;
            if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
                for (const part of response.candidates[0].content.parts) {
                    if (part.inlineData) {
                        const base64Data = part.inlineData.data;
                        const mimeType = part.inlineData.mimeType || 'image/png';
                        generatedImages.push(`data:${mimeType};base64,${base64Data}`);
                        imageFound = true;
                    }
                }
            }
            
            if (!imageFound) {
                 throw new Error("A IA não gerou uma imagem válida. O prompt pode ter sido bloqueado por segurança.");
            }
        }
    }, 2, 3000); // 2 retries (total 3 attempts), start wait 3s

    return generatedImages;

  } catch (error: any) {
    console.error("Error generating creative:", error);
    // Erros já tratados pelo retryOperation ou lançados diretamente
    throw error;
  }
};