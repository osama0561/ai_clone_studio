import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 300; // 5 minutes for multiple images

// Models to try in order of preference
const IMAGE_MODELS = [
  'gemini-2.0-flash-exp-image-generation',
  'gemini-2.0-flash-exp',
  'gemini-2.0-flash-thinking-exp',
  'gemini-1.5-pro'
];

const VARIATIONS = [
  { id: 1, name: "professional", prompt: "Professional headshot, studio lighting, clean background, confident expression" },
  { id: 2, name: "casual_3/4", prompt: "Casual 3/4 angle portrait, natural light, relaxed smile, indoor setting" },
  { id: 3, name: "side_profile", prompt: "Artistic side profile, dramatic lighting, dark background, thoughtful expression" },
  { id: 4, name: "outdoor", prompt: "Outdoor portrait, natural daylight, urban background, candid" },
  { id: 5, name: "serious", prompt: "Direct eye contact, serious authoritative expression, high contrast" }
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

async function findWorkingModel(genAI, testPrompt, imageBase64) {
  for (const modelName of IMAGE_MODELS) {
    const result = await tryGenerateWithModel(genAI, modelName, testPrompt, imageBase64);
    if (result.success) {
      return { modelName, testImage: result.image };
    }
  }
  return null;
}

export async function POST(request) {
  try {
    const { apiKey, imageBase64, count = 5 } = await request.json();

    if (!apiKey || !imageBase64) {
      return Response.json({ success: false, error: 'API key and image required' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const variationsToUse = VARIATIONS.slice(0, Math.min(count, 5));
    const generatedImages = [];

    // First, find a working model
    const testPrompt = `Generate a photorealistic portrait of this EXACT person. Professional headshot.
IDENTITY: Must look EXACTLY like the reference - same face, same features.
Generate a new high-quality portrait image.`;

    const workingModel = await findWorkingModel(genAI, testPrompt, imageBase64);

    if (!workingModel) {
      // No model works - return original image as variations
      return Response.json({
        success: true,
        images: variationsToUse.map(v => ({
          id: v.id,
          name: v.name,
          image: imageBase64
        })),
        count: variationsToUse.length,
        step: 2,
        message: 'Using original image (image generation not available with your API key)',
        note: 'Your Gemini API key does not have access to image generation models.'
      });
    }

    // Use the working model for all variations
    const model = genAI.getGenerativeModel({
      model: workingModel.modelName,
      generationConfig: {
        responseModalities: ['Text', 'Image']
      }
    });

    // First image is from our test
    generatedImages.push({
      id: variationsToUse[0].id,
      name: variationsToUse[0].name,
      image: workingModel.testImage
    });

    // Generate remaining variations
    for (let i = 1; i < variationsToUse.length; i++) {
      const variation = variationsToUse[i];
      try {
        const prompt = `Generate a photorealistic portrait of this EXACT person with these specifications:

IDENTITY: Must look EXACTLY like the reference - same face, same features, same identity.

SCENE: ${variation.prompt}

TECHNICAL: 85mm lens look, RAW quality, natural skin texture, high detail.

Generate a new image maintaining perfect identity match.`;

        const result = await model.generateContent([
          prompt,
          { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }
        ]);

        const response = await result.response;

        if (response.candidates && response.candidates[0]) {
          const parts = response.candidates[0].content.parts;
          for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
              generatedImages.push({
                id: variation.id,
                name: variation.name,
                image: part.inlineData.data
              });
              break;
            }
          }
        }

        // Delay between requests
        await new Promise(r => setTimeout(r, 1500));

      } catch (err) {
        console.error(`Error generating ${variation.name}:`, err.message);
      }
    }

    return Response.json({
      success: true,
      images: generatedImages,
      count: generatedImages.length,
      step: 2,
      message: `Generated ${generatedImages.length} dataset images (using ${workingModel.modelName})`
    });

  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
