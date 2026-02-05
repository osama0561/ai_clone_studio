import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

// Helper to convert base64 to buffer
function base64ToBuffer(base64) {
  const binaryString = Buffer.from(base64, 'base64');
  return binaryString;
}

export async function POST(request) {
  try {
    const { action, supabaseUrl, supabaseKey, sessionId, images, imageName, imageBase64 } = await request.json();

    if (!supabaseUrl || !supabaseKey) {
      return Response.json({ success: false, error: 'Supabase credentials required' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // ACTION: Upload single image
    if (action === 'upload') {
      if (!sessionId || !imageName || !imageBase64) {
        return Response.json({ success: false, error: 'Session ID, image name, and image data required' }, { status: 400 });
      }

      const buffer = base64ToBuffer(imageBase64);
      const filePath = `${sessionId}/${imageName}.jpg`;

      const { data, error } = await supabase.storage
        .from('ai-clone-images')
        .upload(filePath, buffer, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) {
        return Response.json({ success: false, error: error.message }, { status: 500 });
      }

      const { data: urlData } = supabase.storage
        .from('ai-clone-images')
        .getPublicUrl(filePath);

      return Response.json({
        success: true,
        url: urlData.publicUrl,
        path: filePath
      });
    }

    // ACTION: Upload multiple images (batch)
    if (action === 'uploadBatch') {
      if (!sessionId || !images || images.length === 0) {
        return Response.json({ success: false, error: 'Session ID and images required' }, { status: 400 });
      }

      const uploadedImages = [];

      for (const img of images) {
        try {
          const buffer = base64ToBuffer(img.image);
          const filePath = `${sessionId}/${img.name || img.id}.jpg`;

          const { data, error } = await supabase.storage
            .from('ai-clone-images')
            .upload(filePath, buffer, {
              contentType: 'image/jpeg',
              upsert: true
            });

          if (!error) {
            const { data: urlData } = supabase.storage
              .from('ai-clone-images')
              .getPublicUrl(filePath);

            uploadedImages.push({
              id: img.id,
              name: img.name,
              url: urlData.publicUrl,
              path: filePath
            });
          }
        } catch (err) {
          console.error(`Error uploading ${img.name}:`, err.message);
        }
      }

      return Response.json({
        success: true,
        images: uploadedImages,
        count: uploadedImages.length
      });
    }

    // ACTION: List images in session
    if (action === 'list') {
      if (!sessionId) {
        return Response.json({ success: false, error: 'Session ID required' }, { status: 400 });
      }

      const { data, error } = await supabase.storage
        .from('ai-clone-images')
        .list(sessionId);

      if (error) {
        return Response.json({ success: false, error: error.message }, { status: 500 });
      }

      const images = (data || []).map(file => {
        const { data: urlData } = supabase.storage
          .from('ai-clone-images')
          .getPublicUrl(`${sessionId}/${file.name}`);
        return {
          name: file.name.replace('.jpg', ''),
          url: urlData.publicUrl
        };
      });

      return Response.json({ success: true, images });
    }

    return Response.json({ success: false, error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
