import { GoogleGenAI } from '@google/genai';

export const maxDuration = 300; // 5 minutes for video generation

export async function POST(request) {
  try {
    const { apiKey, imageBase64, motionType = 'subtle' } = await request.json();

    if (!apiKey || !imageBase64) {
      return Response.json({ success: false, error: 'API key and image required' }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const motionPrompts = {
      subtle: "A person with subtle natural motion, gentle breathing, soft micro head movements, blinking naturally. Static camera, cinematic lighting.",
      talking: "A person speaking naturally to camera with expressive gestures, head nods, engaging facial expressions. Slight camera drift.",
      cinematic: "Cinematic slow motion shot of a person with dramatic lighting, confident slow turn, dramatic pause. Slow dolly in camera movement.",
      walking: "A person walking naturally toward camera with confident stride, arms swinging naturally. Tracking camera movement."
    };

    const prompt = motionPrompts[motionType] || motionPrompts.subtle;

    console.log('Starting VEO video generation...');

    // Start video generation with VEO 3.1
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-generate-preview',
      prompt: prompt,
      image: {
        imageBytes: imageBase64,
        mimeType: 'image/jpeg'
      },
      config: {
        aspectRatio: '9:16', // Portrait for social media
        numberOfVideos: 1
      }
    });

    console.log('Video generation started, polling for completion...');

    // Poll until the video is ready (max 4 minutes)
    const maxWaitTime = 240000; // 4 minutes
    const pollInterval = 5000; // 5 seconds
    let elapsed = 0;

    while (!operation.done && elapsed < maxWaitTime) {
      await new Promise(r => setTimeout(r, pollInterval));
      elapsed += pollInterval;

      // Refresh operation status
      operation = await ai.operations.get({ name: operation.name });
      console.log(`Polling... elapsed: ${elapsed / 1000}s, done: ${operation.done}`);
    }

    if (operation.done && operation.response?.generatedVideos?.length > 0) {
      const video = operation.response.generatedVideos[0].video;

      return Response.json({
        success: true,
        video: video.videoBytes || video,
        mimeType: video.mimeType || 'video/mp4',
        step: 5,
        message: 'Motion video generated with VEO 3.1!'
      });
    }

    // If operation timed out or failed
    return Response.json({
      success: false,
      step: 5,
      message: operation.done ? 'Video generation completed but no video returned' : 'Video generation timed out',
      suggestion: 'VEO may be processing. Try again or use external tools like Kling AI or Runway.'
    });

  } catch (error) {
    console.error('VEO Error:', error);

    // Check for specific errors
    if (error.message?.includes('not found') || error.message?.includes('404')) {
      return Response.json({
        success: false,
        error: 'VEO model not available',
        suggestion: 'VEO 3.1 requires API access. Use Kling AI, Runway, or Pika Labs for video generation.',
        externalTools: [
          { name: 'Kling AI', url: 'https://klingai.com' },
          { name: 'Runway', url: 'https://runwayml.com' },
          { name: 'Pika Labs', url: 'https://pika.art' }
        ]
      }, { status: 400 });
    }

    if (error.message?.includes('permission') || error.message?.includes('quota')) {
      return Response.json({
        success: false,
        error: 'VEO access requires paid API tier',
        suggestion: 'VEO is in paid preview. Use external video tools for now.',
        externalTools: [
          { name: 'Kling AI', url: 'https://klingai.com' },
          { name: 'Runway', url: 'https://runwayml.com' }
        ]
      }, { status: 403 });
    }

    return Response.json({
      success: false,
      error: error.message,
      suggestion: 'VEO may not be available with your API key. Use external video tools.'
    }, { status: 500 });
  }
}
