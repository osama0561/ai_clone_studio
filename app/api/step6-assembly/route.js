// Step 6: Final Assembly
// Note: Full video assembly requires FFmpeg which can't run on Vercel serverless
// This endpoint provides download links and assembly instructions

export const maxDuration = 60;

export async function POST(request) {
  try {
    const { videoBase64, audioBase64, images } = await request.json();

    // Since we can't run FFmpeg on Vercel, provide assembly guidance
    const response = {
      success: true,
      step: 6,
      message: 'Assets ready for assembly',
      assets: {
        hasVideo: !!videoBase64,
        hasAudio: !!audioBase64,
        imageCount: images?.length || 0
      },
      instructions: {
        option1: {
          name: 'CapCut (Recommended)',
          steps: [
            'Download all images below',
            'Open CapCut (free app)',
            'Import images as slideshow',
            'Add Ken Burns effect (zoom/pan)',
            'Import audio file',
            'Export as MP4'
          ]
        },
        option2: {
          name: 'Canva',
          steps: [
            'Go to canva.com',
            'Create video project',
            'Upload images',
            'Add animations',
            'Add audio',
            'Download MP4'
          ]
        },
        option3: {
          name: 'FFmpeg (Local)',
          command: `ffmpeg -framerate 1/4 -i image_%d.jpg -i audio.mp3 -c:v libx264 -pix_fmt yuv420p -shortest output.mp4`
        }
      },
      downloads: {
        images: images ? images.map((img, i) => ({
          name: `image_${i + 1}.jpg`,
          data: img.image || img
        })) : [],
        audio: audioBase64 ? {
          name: 'voiceover.mp3',
          data: audioBase64
        } : null,
        video: videoBase64 ? {
          name: 'motion.mp4',
          data: videoBase64
        } : null
      }
    };

    return Response.json(response);

  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
