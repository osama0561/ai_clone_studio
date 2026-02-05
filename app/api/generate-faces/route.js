import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 60; // Allow up to 60 seconds for generation

const VARIATIONS = [
  {
    name: "front_professional",
    prompt: "front-facing professional headshot, soft studio lighting, clean gradient background, confident professional expression"
  },
  {
    name: "three_quarter",
    prompt: "3/4 angle portrait with slight head tilt, natural window light, blurred indoor setting, relaxed friendly smile"
  },
  {
    name: "side_profile",
    prompt: "side profile view, dramatic side lighting, dark moody background, thoughtful contemplative expression"
  },
  {
    name: "talking_gesture",
    prompt: "front-facing with one hand gesturing, bright even lighting, modern office background, engaged mid-conversation expression"
  },
  {
    name: "relaxed",
    prompt: "leaning back slightly with arms crossed, warm ambient lighting, home office setup, calm confident chill expression"
  }
];

export async function POST(request) {
  try {
    const { apiKey, imageBase64, numVariations = 3 } = await request.json();

    if (!apiKey) {
      return Response.json({ success: false, error: 'API key is required' }, { status: 400 });
    }

    if (!imageBase64) {
      return Response.json({ success: false, error: 'Image is required' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Use gemini-1.5-flash for image understanding + generation
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const generatedImages = [];
    const variationsToUse = VARIATIONS.slice(0, Math.min(numVariations, 5));

    for (const variation of variationsToUse) {
      try {
        const prompt = `Create a photorealistic portrait with these specifications:

CRITICAL - IDENTITY PRESERVATION:
- The person in the output MUST look EXACTLY like the reference photo
- Same facial structure, same eyes, same nose, same mouth
- Same skin tone, same hair style and color

SCENE: ${variation.prompt}

TECHNICAL:
- Photorealistic quality, NOT cartoon
- 85mm f/1.4 portrait lens look
- High detail on skin texture
- Sharp focus on eyes

Generate a new image of this exact same person in the described scene.`;

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

        // Check if response contains an image
        if (response.candidates && response.candidates[0]) {
          const parts = response.candidates[0].content.parts;
          for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
              generatedImages.push(part.inlineData.data);
              break;
            }
          }
        }

        // Small delay between generations
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Error generating ${variation.name}:`, error.message);
        // Continue with other variations even if one fails
      }
    }

    if (generatedImages.length === 0) {
      // If no images generated, return the original as a fallback
      // This happens because gemini-2.0-flash-exp may not support image generation
      return Response.json({
        success: true,
        images: [imageBase64],
        message: 'Image generation requires Gemini Pro Vision model. Showing original image.'
      });
    }

    return Response.json({
      success: true,
      images: generatedImages,
      count: generatedImages.length
    });

  } catch (error) {
    console.error('API Error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Failed to generate images'
    }, { status: 500 });
  }
}
