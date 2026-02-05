import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 60;

export async function POST(request) {
  try {
    const { apiKey, imageBase64 } = await request.json();

    if (!apiKey || !imageBase64) {
      return Response.json({ success: false, error: 'API key and image required' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Use Gemini 2.0 Flash with image generation capability
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        responseModalities: ['Text', 'Image']
      }
    });

    const prompt = `Generate a photorealistic 85mm f/1.4 RAW portrait of this exact person.
Keep the same identity, same hair, same facial proportions. Apply soft studio lighting,
clean gradient background, high micro-detail with real skin texture and pores.
Preserve facial structure accurately. Professional headshot quality.

CRITICAL: The output image must look EXACTLY like this person - same face, same features.
Generate a new high-quality portrait image.`;

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

      // If only text response, return original image with note
      const textPart = parts.find(p => p.text);
      return Response.json({
        success: true,
        image: imageBase64,
        step: 1,
        message: 'Using original image',
        note: textPart?.text || 'Image generation not available with current API access'
      });
    }

    // If no image generated, return original with message
    return Response.json({
      success: true,
      image: imageBase64,
      step: 1,
      message: 'Using original image (model may not support image generation)'
    });

  } catch (error) {
    // If model not found, try fallback
    if (error.message?.includes('not found') || error.message?.includes('404')) {
      return Response.json({
        success: false,
        error: 'Image generation model not available. Please ensure your API key has access to gemini-2.0-flash-exp with image generation.',
        suggestion: 'Try enabling Gemini 2.0 Flash experimental features in Google AI Studio'
      }, { status: 400 });
    }
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
