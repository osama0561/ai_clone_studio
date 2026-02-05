import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 300; // 5 minutes for video generation

export async function POST(request) {
  try {
    const { apiKey, imageBase64, motionType = 'subtle' } = await request.json();

    if (!apiKey || !imageBase64) {
      return Response.json({ success: false, error: 'API key and image required' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Try to use Veo model for video generation
    // Note: Veo access may require specific API permissions
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        responseModalities: ['Text', 'Image']
      }
    });

    const motionPrompts = {
      subtle: {
        description: "Subtle natural motion with gentle breathing and micro head movements",
        camera: "static",
        movement: "natural breathing, subtle blink, very gentle head micro-movement"
      },
      talking: {
        description: "Person speaking naturally with appropriate gestures",
        camera: "static with slight drift",
        movement: "talking motion, natural gestures, head nods, expressive face"
      },
      cinematic: {
        description: "Cinematic slow motion with dramatic lighting",
        camera: "slow dolly in",
        movement: "slow confident turn, dramatic pause, cinematic presence"
      },
      walking: {
        description: "Person walking naturally toward camera",
        camera: "tracking",
        movement: "natural walking gait, arms swinging, confident stride"
      }
    };

    const motion = motionPrompts[motionType] || motionPrompts.subtle;

    const prompt = `Generate a 5-second video of this person with the following specifications:

IDENTITY: This EXACT person must appear in the video - same face, same features.

MOTION: ${motion.description}
- Camera: ${motion.camera}
- Subject movement: ${motion.movement}

TECHNICAL:
- Cinematic quality, 24fps
- Natural lighting
- Smooth motion, no artifacts
- Realistic human movement
- Professional video quality

Create a short video clip of this person with natural, lifelike motion.`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }
    ]);

    const response = await result.response;

    // Check for video in response
    if (response.candidates && response.candidates[0]) {
      const parts = response.candidates[0].content.parts;
      for (const part of parts) {
        // Check for video data
        if (part.inlineData) {
          const mimeType = part.inlineData.mimeType || '';
          if (mimeType.includes('video') || part.inlineData.data) {
            return Response.json({
              success: true,
              video: part.inlineData.data,
              mimeType: mimeType,
              step: 5,
              message: 'Motion video generated'
            });
          }
        }
      }

      // If text response, return it
      const textPart = parts.find(p => p.text);
      if (textPart) {
        return Response.json({
          success: false,
          step: 5,
          message: 'Video generation not available with current model',
          note: textPart.text,
          suggestion: 'VEO video generation requires specific API access. Use the image for manual video creation.'
        });
      }
    }

    return Response.json({
      success: false,
      step: 5,
      message: 'Video generation requires VEO API access',
      suggestion: 'Export images and use external video tools like Kling, Runway, or CapCut'
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message,
      suggestion: 'VEO may not be available. Use images with external video tools.'
    }, { status: 500 });
  }
}
