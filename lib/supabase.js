import { createClient } from '@supabase/supabase-js';

// Create Supabase client - these will be provided by the user in the UI
export function createSupabaseClient(supabaseUrl, supabaseKey) {
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseKey);
}

// Upload image to Supabase Storage
export async function uploadImage(supabase, sessionId, imageName, base64Data) {
  try {
    // Convert base64 to blob
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/jpeg' });

    // Upload to storage
    const filePath = `${sessionId}/${imageName}.jpg`;
    const { data, error } = await supabase.storage
      .from('ai-clone-images')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('ai-clone-images')
      .getPublicUrl(filePath);

    return { success: true, url: urlData.publicUrl, path: filePath };
  } catch (error) {
    console.error('Upload error:', error);
    return { success: false, error: error.message };
  }
}

// Save session data to database
export async function saveSession(supabase, sessionId, sessionData) {
  try {
    const { data, error } = await supabase
      .from('ai_clone_sessions')
      .upsert({
        id: sessionId,
        data: sessionData,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Save session error:', error);
    return { success: false, error: error.message };
  }
}

// Load session data
export async function loadSession(supabase, sessionId) {
  try {
    const { data, error } = await supabase
      .from('ai_clone_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) throw error;
    return { success: true, session: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// List images in a session folder
export async function listSessionImages(supabase, sessionId) {
  try {
    const { data, error } = await supabase.storage
      .from('ai-clone-images')
      .list(sessionId);

    if (error) throw error;

    // Get public URLs for all images
    const images = data.map(file => {
      const { data: urlData } = supabase.storage
        .from('ai-clone-images')
        .getPublicUrl(`${sessionId}/${file.name}`);
      return {
        name: file.name.replace('.jpg', ''),
        url: urlData.publicUrl
      };
    });

    return { success: true, images };
  } catch (error) {
    return { success: false, error: error.message, images: [] };
  }
}
