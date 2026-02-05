import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 300; // 5 minutes for multiple images

const VARIATIONS = [
  { id: 1, name: "professional", prompt: "Professional headshot, studio lighting, clean background, confident expression" },
  { id: 2, name: "casual_3/4", prompt: "Casual 3/4 angle portrait, natural light, relaxed smile, indoor setting" },
  { id: 3, name: "side_profile", prompt: "Artistic side profile, dramatic lighting, dark background, thoughtful expression" },
  { id: 4, name: "outdoor_walking", prompt: "Walking outdoors, natural daylight, urban background, candid movement" },
  { id: 5, name: "desk_working", prompt: "Sitting at desk with laptop, office environment, focused expression" },
  { id: 6, name: "talking_gesture", prompt: "Mid-conversation with hand gesture, bright lighting, engaged expression" },
  { id: 7, name: "arms_crossed", prompt: "Arms crossed confidently, power pose, professional setting" },
  { id: 8, name: "looking_up", prompt: "Looking slightly upward, inspired expression, soft lighting from above" },
  { id: 9, name: "serious_direct", prompt: "Direct eye contact, serious authoritative expression, high contrast" },
  { id: 10, name: "relaxed_lean", prompt: "Leaning back relaxed, casual setting, calm confident expression" }
];

export async function POST(request) {
  try {
    const { apiKey, imageBase64, count = 5 } = await request.json();

    if (!apiKey || !imageBase64) {
      return Response.json({ success: false, error: 'API key and image required' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const variationsToUse = VARIATIONS.slice(0, Math.min(count, 10));
    const generatedImages = [];

    for (const variation of variationsToUse) {
      try {
        const prompt = `Create a photorealistic portrait of this EXACT person with these specifications:

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

        // Small delay between requests
        await new Promise(r => setTimeout(r, 500));

      } catch (err) {
        console.error(`Error generating ${variation.name}:`, err.message);
      }
    }

    // If no images generated, return original as fallback
    if (generatedImages.length === 0) {
      generatedImages.push({
        id: 0,
        name: 'original',
        image: imageBase64
      });
    }

    return Response.json({
      success: true,
      images: generatedImages,
      count: generatedImages.length,
      step: 2,
      message: `Generated ${generatedImages.length} dataset images`
    });

  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
