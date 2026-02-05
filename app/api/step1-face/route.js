import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 60;

// Models to try in order of preference (Nano Banana Pro first for best quality)
const IMAGE_MODELS = [
  'gemini-3-pro-image-preview',      // Nano Banana Pro - best quality
  'gemini-2.5-flash-image',          // Nano Banana - fast & efficient
  'gemini-2.0-flash-exp-image-generation',
  'gemini-2.0-flash-exp'
];

async function tryGenerateWithModel(genAI, modelName, prompt, imageBase64) {
  try {
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseModalities: ['Text', 'Image']
      }
    });

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBase64
        }
      }
    ]);

    const response = await result.response;

    if (response.candidates && response.candidates[0]) {
      const parts = response.candidates[0].content.parts;
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          return { success: true, image: part.inlineData.data, model: modelName };
        }
      }
    }
    return { success: false, error: 'No image in response' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function POST(request) {
  try {
    const { apiKey, imageBase64 } = await request.json();

    if (!apiKey || !imageBase64) {
      return Response.json({ success: false, error: 'API key and image required' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const prompt = `Generate a photorealistic 85mm f/1.4 RAW portrait of this exact person.
Keep the same identity, same hair, same facial proportions. Apply soft studio lighting,
clean gradient background, high micro-detail with real skin texture and pores.
Preserve facial structure accurately. Professional headshot quality.

CRITICAL: The output image must look EXACTLY like this person - same face, same features.
Generate a new high-quality portrait image.`;

    // Try each model until one works
    let lastError = '';
    for (const modelName of IMAGE_MODELS) {
      console.log(`Trying model: ${modelName}`);
      const result = await tryGenerateWithModel(genAI, modelName, prompt, imageBase64);

      if (result.success) {
        return Response.json({
          success: true,
          image: result.image,
          step: 1,
          message: `Face created successfully (using ${modelName})`
        });
      }
      lastError = result.error;
    }

    // All models failed - return original image as fallback
    return Response.json({
      success: true,
      image: imageBase64,
      step: 1,
      message: 'Using original image (image generation not available)',
      note: `Tried models: ${IMAGE_MODELS.join(', ')}. Last error: ${lastError}`,
      suggestion: 'Your API key may not have access to image generation models. The workflow will continue with your original image.'
    });

  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
