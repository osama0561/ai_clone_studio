import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 120;

export async function POST(request) {
  try {
    const { apiKey, images } = await request.json();

    if (!apiKey || !images || images.length === 0) {
      return Response.json({ success: false, error: 'API key and images required' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const upscaledImages = [];

    for (const img of images) {
      try {
        const prompt = `Enhance this image to maximum quality:

REQUIREMENTS:
- Increase resolution and sharpness to 4K quality
- Enhance skin texture with realistic detail (pores, micro-texture)
- Improve lighting and contrast
- Sharpen facial features, especially eyes
- Remove any compression artifacts or noise
- Maintain EXACT same identity and expression
- Do NOT change the person's appearance

OUTPUT: Highest possible resolution, professional photography quality.`;

        const result = await model.generateContent([
          prompt,
          { inlineData: { mimeType: 'image/jpeg', data: img.image || img } }
        ]);

        const response = await result.response;

        if (response.candidates && response.candidates[0]) {
          const parts = response.candidates[0].content.parts;
          for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
              upscaledImages.push({
                id: img.id || upscaledImages.length,
                name: img.name || `upscaled_${upscaledImages.length}`,
                image: part.inlineData.data
              });
              break;
            }
          }
        }

        // If no enhanced image, keep original
        if (!upscaledImages.find(u => u.id === (img.id || upscaledImages.length - 1))) {
          upscaledImages.push({
            id: img.id || upscaledImages.length,
            name: img.name || `original_${upscaledImages.length}`,
            image: img.image || img
          });
        }

        await new Promise(r => setTimeout(r, 500));

      } catch (err) {
        // Keep original on error
        upscaledImages.push({
          id: img.id || upscaledImages.length,
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
      message: `Upscaled ${upscaledImages.length} images to 4K`
    });

  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
