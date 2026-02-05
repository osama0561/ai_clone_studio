import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 120;

// Models to try in order of preference (Nano Banana Pro first for best quality)
const IMAGE_MODELS = [
  'gemini-3-pro-image-preview',      // Nano Banana Pro - best quality
  'gemini-2.5-flash-image',          // Nano Banana - fast & efficient
  'gemini-2.0-flash-exp-image-generation',
  'gemini-2.0-flash-exp'
];

async function tryEnhanceWithModel(genAI, modelName, prompt, imageBase64) {
  try {
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseModalities: ['Text', 'Image']
      }
    });

    const result = await model.generateContent([
      prompt,
      { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }
    ]);

    const response = await result.response;

    if (response.candidates && response.candidates[0]) {
      const parts = response.candidates[0].content.parts;
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          return { success: true, image: part.inlineData.data };
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
    const { apiKey, images } = await request.json();

    if (!apiKey || !images || images.length === 0) {
      return Response.json({ success: false, error: 'API key and images required' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const upscaledImages = [];

    const enhancePrompt = `Enhance this image to maximum quality:

REQUIREMENTS:
- Increase resolution and sharpness to 4K quality
- Enhance skin texture with realistic detail (pores, micro-texture)
- Improve lighting and contrast
- Sharpen facial features, especially eyes
- Remove any compression artifacts or noise
- Maintain EXACT same identity and expression
- Do NOT change the person's appearance

OUTPUT: Generate a highest possible resolution, professional photography quality version of this image.`;

    // Find a working model first
    let workingModel = null;
    const firstImage = images[0]?.image || images[0];

    for (const modelName of IMAGE_MODELS) {
      const result = await tryEnhanceWithModel(genAI, modelName, enhancePrompt, firstImage);
      if (result.success) {
        workingModel = modelName;
        upscaledImages.push({
          id: images[0].id || 0,
          name: images[0].name || 'upscaled_0',
          image: result.image
        });
        break;
      }
    }

    // If no model works, return originals
    if (!workingModel) {
      return Response.json({
        success: true,
        images: images.map((img, i) => ({
          id: img.id || i,
          name: img.name || `original_${i}`,
          image: img.image || img
        })),
        count: images.length,
        step: 3,
        message: 'Using original images (enhancement not available with your API key)'
      });
    }

    // Process remaining images with the working model
    for (let i = 1; i < images.length; i++) {
      const img = images[i];
      try {
        const result = await tryEnhanceWithModel(genAI, workingModel, enhancePrompt, img.image || img);

        if (result.success) {
          upscaledImages.push({
            id: img.id || i,
            name: img.name || `upscaled_${i}`,
            image: result.image
          });
        } else {
          // Keep original on failure
          upscaledImages.push({
            id: img.id || i,
            name: img.name || `original_${i}`,
            image: img.image || img
          });
        }

        await new Promise(r => setTimeout(r, 1000));

      } catch (err) {
        upscaledImages.push({
          id: img.id || i,
          name: img.name || 'original',
          image: img.image || img
        });
      }
    }

    return Response.json({
      success: true,
      images: upscaledImages,
      count: upscaledImages.length,
      step: 3,
      message: `Enhanced ${upscaledImages.length} images (using ${workingModel})`
    });

  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
