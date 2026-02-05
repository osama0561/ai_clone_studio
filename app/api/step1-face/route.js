import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 60;

export async function POST(request) {
  try {
    const { apiKey, imageBase64 } = await request.json();

    if (!apiKey || !imageBase64) {
      return Response.json({ success: false, error: 'API key and image required' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `A photorealistic 85mm f/1.4 RAW portrait of this exact person,
same identity, same hair, same facial proportions. Soft studio lighting,
clean gradient background, high micro-detail with real skin texture and pores.
Preserve facial structure accurately. Professional headshot quality.

CRITICAL: The output must look EXACTLY like this person - same face, same features.`;

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

    // Check for generated image
    if (response.candidates && response.candidates[0]) {
      const parts = response.candidates[0].content.parts;
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          return Response.json({
            success: true,
            image: part.inlineData.data,
            step: 1,
            message: 'Face created successfully'
          });
        }
      }
    }

    // If no image generated, return original with message
    return Response.json({
      success: true,
      image: imageBase64,
      step: 1,
      message: 'Using original image (model may not support image generation)'
    });

  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
