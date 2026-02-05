'use client';

import { useState, useEffect } from 'react';

// Generate unique session ID
function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export default function Home() {
  // Credentials
  const [apiKey, setApiKey] = useState('');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [sessionId, setSessionId] = useState('');

  // State
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  // Step 1: Face
  const [uploadedImage, setUploadedImage] = useState(null);
  const [uploadedImageBase64, setUploadedImageBase64] = useState(null);
  const [faceImage, setFaceImage] = useState(null); // base64 for API
  const [faceImageUrl, setFaceImageUrl] = useState(null); // URL for display

  // Step 2: Dataset - now stores URLs
  const [datasetImages, setDatasetImages] = useState([]);

  // Step 3: Upscaled - now stores URLs
  const [upscaledImages, setUpscaledImages] = useState([]);

  // Step 4: Voice
  const [script, setScript] = useState('');
  const [audioUrl, setAudioUrl] = useState(null);

  // Step 5: Motion
  const [selectedImage, setSelectedImage] = useState(null);
  const [motionType, setMotionType] = useState('subtle');
  const [videoData, setVideoData] = useState(null);

  // Initialize session ID
  useEffect(() => {
    if (!sessionId) {
      setSessionId(generateSessionId());
    }
  }, [sessionId]);

  // Helper: Upload single image to Supabase
  const uploadToSupabase = async (base64, name) => {
    if (!supabaseUrl || !supabaseKey) return null;

    try {
      const res = await fetch('/api/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upload',
          supabaseUrl,
          supabaseKey,
          sessionId,
          imageName: name,
          imageBase64: base64
        })
      });
      const data = await res.json();
      return data.success ? data.url : null;
    } catch (err) {
      console.error('Upload error:', err);
      return null;
    }
  };

  // Helper: Upload batch of images to Supabase
  const uploadBatchToSupabase = async (images) => {
    if (!supabaseUrl || !supabaseKey) return images;

    try {
      const res = await fetch('/api/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'uploadBatch',
          supabaseUrl,
          supabaseKey,
          sessionId,
          images
        })
      });
      const data = await res.json();
      return data.success ? data.images : [];
    } catch (err) {
      console.error('Batch upload error:', err);
      return [];
    }
  };

  // Handle image upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedImage(URL.createObjectURL(file));
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImageBase64(reader.result.split(',')[1]);
      };
      reader.readAsDataURL(file);
    }
  };

  // Step 1: Generate Face
  const generateFace = async () => {
    if (!apiKey) return setStatus('أدخل مفتاح Gemini API');
    if (!uploadedImageBase64) return setStatus('ارفع صورة أولاً');

    setLoading(true);
    setStatus('جاري إنشاء الوجه...');

    try {
      const res = await fetch('/api/step1-face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, imageBase64: uploadedImageBase64 })
      });
      const data = await res.json();

      if (data.success) {
        setFaceImage(data.image);

        // Upload to Supabase if configured
        if (supabaseUrl && supabaseKey) {
          setStatus('جاري رفع الصورة إلى Supabase...');
          const url = await uploadToSupabase(data.image, 'face_01');
          if (url) {
            setFaceImageUrl(url);
            setStatus('✅ تم إنشاء الوجه وحفظه!');
          } else {
            setStatus('✅ تم إنشاء الوجه! (فشل الرفع إلى Supabase)');
          }
        } else {
          setStatus('✅ تم إنشاء الوجه! (أضف Supabase للحفظ الدائم)');
        }
        setCurrentStep(2);
      } else {
        setStatus(`❌ ${data.error || data.suggestion || 'حدث خطأ'}`);
      }
    } catch (err) {
      setStatus(`❌ ${err.message}`);
    }
    setLoading(false);
  };

  // Step 2: Generate Dataset
  const generateDataset = async () => {
    if (!faceImage) return setStatus('أكمل الخطوة 1 أولاً');

    setLoading(true);
    setStatus('جاري بناء مجموعة البيانات...');

    try {
      const res = await fetch('/api/step2-dataset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, imageBase64: faceImage, count: 5 })
      });
      const data = await res.json();

      if (data.success && data.images) {
        // Upload to Supabase if configured
        if (supabaseUrl && supabaseKey) {
          setStatus(`جاري رفع ${data.images.length} صورة إلى Supabase...`);
          const uploadedImages = await uploadBatchToSupabase(data.images);
          if (uploadedImages.length > 0) {
            setDatasetImages(uploadedImages);
            setStatus(`✅ تم إنشاء ورفع ${uploadedImages.length} صورة!`);
          } else {
            // Fallback to base64 with URLs
            setDatasetImages(data.images.map(img => ({
              ...img,
              url: `data:image/jpeg;base64,${img.image}`
            })));
            setStatus(`✅ تم إنشاء ${data.count} صورة! (فشل الرفع)`);
          }
        } else {
          // No Supabase - use data URLs
          setDatasetImages(data.images.map(img => ({
            ...img,
            url: `data:image/jpeg;base64,${img.image}`
          })));
          setStatus(`✅ تم إنشاء ${data.count} صورة! (أضف Supabase للحفظ)`);
        }
        setCurrentStep(3);
      } else {
        setStatus(`❌ ${data.error || 'لم يتم إنشاء صور'}`);
      }
    } catch (err) {
      setStatus(`❌ ${err.message}`);
    }
    setLoading(false);
  };

  // Step 3: Upscale
  const upscaleImages = async () => {
    if (datasetImages.length === 0) return setStatus('أكمل الخطوة 2 أولاً');

    setLoading(true);
    setStatus('جاري تحسين الدقة إلى 4K...');

    try {
      // Prepare images - use base64 data if available
      const imagesToUpscale = datasetImages.map(img => ({
        id: img.id,
        name: `upscaled_${img.name}`,
        image: img.image || (img.url?.startsWith('data:') ? img.url.split(',')[1] : null)
      })).filter(img => img.image);

      if (imagesToUpscale.length === 0) {
        setStatus('⚠️ لا توجد صور للتحسين - استخدم الصور الحالية');
        setUpscaledImages(datasetImages);
        setCurrentStep(4);
        setLoading(false);
        return;
      }

      const res = await fetch('/api/step3-upscale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, images: imagesToUpscale })
      });
      const data = await res.json();

      if (data.success && data.images) {
        // Upload to Supabase if configured
        if (supabaseUrl && supabaseKey) {
          setStatus(`جاري رفع ${data.images.length} صورة محسنة...`);
          const uploadedImages = await uploadBatchToSupabase(data.images);
          if (uploadedImages.length > 0) {
            setUpscaledImages(uploadedImages);
            setStatus(`✅ تم تحسين ورفع ${uploadedImages.length} صورة!`);
          } else {
            setUpscaledImages(data.images.map(img => ({
              ...img,
              url: `data:image/jpeg;base64,${img.image}`
            })));
            setStatus(`✅ تم تحسين ${data.count} صورة!`);
          }
        } else {
          setUpscaledImages(data.images.map(img => ({
            ...img,
            url: `data:image/jpeg;base64,${img.image}`
          })));
          setStatus(`✅ تم تحسين ${data.count} صورة!`);
        }
        setCurrentStep(4);
      } else {
        setStatus(`❌ ${data.error}`);
      }
    } catch (err) {
      setStatus(`❌ ${err.message}`);
    }
    setLoading(false);
  };

  // Step 4: Generate Voice (Browser TTS)
  const generateVoice = () => {
    if (!script) return setStatus('اكتب النص أولاً');

    setLoading(true);
    setStatus('جاري توليد الصوت...');

    try {
      const utterance = new SpeechSynthesisUtterance(script);
      utterance.lang = 'ar-SA';
      utterance.rate = 0.9;

      const voices = speechSynthesis.getVoices();
      const arabicVoice = voices.find(v => v.lang.includes('ar'));
      if (arabicVoice) utterance.voice = arabicVoice;

      speechSynthesis.speak(utterance);

      setTimeout(() => {
        setAudioUrl('generated');
        setStatus('✅ تم توليد الصوت! (Browser TTS)');
        setCurrentStep(5);
        setLoading(false);
      }, 2000);

    } catch (err) {
      setStatus(`❌ ${err.message}`);
      setLoading(false);
    }
  };

  // Step 5: Generate Motion Video
  const generateMotion = async () => {
    const imageToUse = selectedImage || upscaledImages[0]?.image || datasetImages[0]?.image || faceImage;
    if (!imageToUse) return setStatus('اختر صورة أولاً');

    setLoading(true);
    setStatus('جاري توليد الفيديو بـ VEO...');

    try {
      const res = await fetch('/api/step5-motion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, imageBase64: imageToUse, motionType })
      });
      const data = await res.json();

      if (data.success && data.video) {
        setVideoData(data.video);
        setStatus('✅ تم توليد الفيديو!');
      } else {
        setStatus(`⚠️ ${data.message || data.suggestion || 'VEO غير متاح'}`);
      }
      setCurrentStep(6);
    } catch (err) {
      setStatus(`⚠️ VEO غير متاح - استخدم الصور مع أداة خارجية`);
      setCurrentStep(6);
    }
    setLoading(false);
  };

  // Download helper for URLs
  const downloadImage = (url, filename) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    link.click();
  };

  const downloadAllImages = () => {
    const images = upscaledImages.length > 0 ? upscaledImages : datasetImages;
    images.forEach((img, i) => {
      setTimeout(() => {
        if (img.url) {
          downloadImage(img.url, `clone_${img.name || i + 1}.jpg`);
        }
      }, i * 500);
    });
  };

  // Steps config
  const steps = [
    { num: 1, title: 'Face Creation', arabic: 'إنشاء الوجه', icon: '👤' },
    { num: 2, title: 'Dataset Building', arabic: 'بناء المجموعة', icon: '📸' },
    { num: 3, title: 'Upscale 4K', arabic: 'تحسين الدقة', icon: '✨' },
    { num: 4, title: 'Voice Clone', arabic: 'استنساخ الصوت', icon: '🎤' },
    { num: 5, title: 'Motion Video', arabic: 'فيديو الحركة', icon: '🎬' },
    { num: 6, title: 'Assembly', arabic: 'التجميع', icon: '📦' },
  ];

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold mb-2">🎬 NICOLA.AI Clone Studio</h1>
        <p className="text-gray-400">حوّل صورتك إلى استنساخ AI كامل</p>
        {sessionId && <p className="text-xs text-gray-600 mt-1">Session: {sessionId}</p>}
      </div>

      {/* API Keys */}
      <div className="card mb-6 space-y-3">
        <div className="flex gap-4 items-center">
          <span>🔑</span>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Gemini API Key..."
            className="flex-1 p-3 rounded-lg bg-darker border border-gray-700 text-white"
          />
          {apiKey && <span className="text-green-400">✅</span>}
        </div>

        <div className="border-t border-gray-700 pt-3">
          <p className="text-sm text-gray-400 mb-2">🗄️ Supabase Storage (اختياري - للحفظ الدائم)</p>
          <div className="grid md:grid-cols-2 gap-2">
            <input
              type="text"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              placeholder="Supabase URL (https://xxx.supabase.co)"
              className="p-2 rounded-lg bg-darker border border-gray-700 text-white text-sm"
            />
            <input
              type="password"
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
              placeholder="Supabase Anon Key"
              className="p-2 rounded-lg bg-darker border border-gray-700 text-white text-sm"
            />
          </div>
          {supabaseUrl && supabaseKey && <span className="text-xs text-green-400">✅ Supabase متصل</span>}
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex justify-between mb-8 overflow-x-auto pb-2">
        {steps.map((step) => (
          <div
            key={step.num}
            className={`flex flex-col items-center min-w-[80px] cursor-pointer transition-all ${
              currentStep === step.num ? 'scale-110' : 'opacity-60'
            }`}
            onClick={() => setCurrentStep(step.num)}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl mb-2 ${
              currentStep > step.num ? 'bg-green-600' :
              currentStep === step.num ? 'bg-primary' : 'bg-gray-700'
            }`}>
              {currentStep > step.num ? '✓' : step.icon}
            </div>
            <span className="text-xs text-center">{step.arabic}</span>
          </div>
        ))}
      </div>

      {/* Status */}
      {status && (
        <div className={`p-4 rounded-lg mb-6 text-center ${
          status.includes('❌') ? 'bg-red-900/50' :
          status.includes('✅') ? 'bg-green-900/50' : 'bg-blue-900/50'
        }`}>
          {loading && <div className="spinner mx-auto mb-2"></div>}
          {status}
        </div>
      )}

      {/* Step Content */}
      <div className="card">
        {/* STEP 1: Face Creation */}
        {currentStep === 1 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">👤 الخطوة 1: إنشاء الوجه</h2>
            <p className="text-gray-400 mb-4">ارفع صورة سيلفي واضحة لإنشاء الوجه الأساسي</p>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-white cursor-pointer"
                />
                {uploadedImage && (
                  <img src={uploadedImage} alt="Upload" className="mt-4 w-48 h-48 object-cover rounded-lg" />
                )}
              </div>
              <div>
                {(faceImageUrl || faceImage) && (
                  <div>
                    <p className="text-sm text-gray-400 mb-2">الوجه المُنشأ:</p>
                    <img
                      src={faceImageUrl || `data:image/jpeg;base64,${faceImage}`}
                      alt="Face"
                      className="w-48 h-48 object-cover rounded-lg"
                    />
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={generateFace}
              disabled={loading || !uploadedImage}
              className="mt-6 w-full py-3 rounded-lg font-bold bg-primary text-white disabled:bg-gray-700 disabled:cursor-not-allowed"
            >
              {loading ? 'جاري الإنشاء...' : '🎨 إنشاء الوجه'}
            </button>
          </div>
        )}

        {/* STEP 2: Dataset Building */}
        {currentStep === 2 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">📸 الخطوة 2: بناء مجموعة البيانات</h2>
            <p className="text-gray-400 mb-4">إنشاء صور متنوعة بأوضاع وزوايا مختلفة</p>

            {/* Show existing face */}
            {(faceImageUrl || faceImage) && (
              <div className="mb-4">
                <p className="text-sm text-gray-400 mb-2">الصورة الأساسية:</p>
                <img
                  src={faceImageUrl || `data:image/jpeg;base64,${faceImage}`}
                  alt="Base face"
                  className="w-32 h-32 object-cover rounded-lg"
                />
              </div>
            )}

            {/* Show generated dataset */}
            {datasetImages.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-400 mb-2">الصور المُنشأة ({datasetImages.length}):</p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {datasetImages.map((img, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={img.url}
                        alt={img.name}
                        className="w-full aspect-square object-cover rounded-lg"
                      />
                      <span className="absolute bottom-1 left-1 text-xs bg-black/70 px-2 rounded">{img.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={generateDataset}
              disabled={loading || !faceImage}
              className="w-full py-3 rounded-lg font-bold bg-primary text-white disabled:bg-gray-700"
            >
              {loading ? 'جاري البناء...' : '📸 بناء المجموعة (5 صور)'}
            </button>
          </div>
        )}

        {/* STEP 3: Upscale */}
        {currentStep === 3 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">✨ الخطوة 3: تحسين الدقة إلى 4K</h2>
            <p className="text-gray-400 mb-4">تحسين جودة الصور للفيديو</p>

            {/* Show dataset images */}
            {datasetImages.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-400 mb-2">الصور الحالية ({datasetImages.length}):</p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {datasetImages.map((img, i) => (
                    <img
                      key={i}
                      src={img.url}
                      alt={img.name}
                      className="w-full aspect-square object-cover rounded-lg"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Show upscaled images */}
            {upscaledImages.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-green-400 mb-2">الصور المحسنة ({upscaledImages.length}):</p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {upscaledImages.map((img, i) => (
                    <img
                      key={i}
                      src={img.url}
                      alt={`Upscaled ${i}`}
                      className="w-full aspect-square object-cover rounded-lg border-2 border-green-500"
                    />
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={upscaleImages}
              disabled={loading || datasetImages.length === 0}
              className="w-full py-3 rounded-lg font-bold bg-primary text-white disabled:bg-gray-700"
            >
              {loading ? 'جاري التحسين...' : '✨ تحسين إلى 4K'}
            </button>
          </div>
        )}

        {/* STEP 4: Voice */}
        {currentStep === 4 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">🎤 الخطوة 4: توليد الصوت</h2>
            <p className="text-gray-400 mb-4">اكتب النص العربي للتعليق الصوتي</p>

            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="اكتب النص هنا..."
              className="w-full h-32 p-4 rounded-lg bg-darker border border-gray-700 text-white mb-4"
            />

            {audioUrl && (
              <div className="p-4 bg-green-900/30 rounded-lg mb-4">
                ✅ تم توليد الصوت باستخدام Browser TTS
              </div>
            )}

            <button
              onClick={generateVoice}
              disabled={loading || !script}
              className="w-full py-3 rounded-lg font-bold bg-primary text-white disabled:bg-gray-700"
            >
              {loading ? 'جاري التوليد...' : '🔊 توليد الصوت'}
            </button>
          </div>
        )}

        {/* STEP 5: Motion */}
        {currentStep === 5 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">🎬 الخطوة 5: فيديو الحركة (VEO)</h2>
            <p className="text-gray-400 mb-4">تحويل الصورة إلى فيديو بحركة طبيعية</p>

            <div className="mb-4">
              <label className="block text-sm mb-2">نوع الحركة:</label>
              <select
                value={motionType}
                onChange={(e) => setMotionType(e.target.value)}
                className="w-full p-3 rounded-lg bg-darker border border-gray-700 text-white"
              >
                <option value="subtle">حركة خفيفة (تنفس، رمش)</option>
                <option value="talking">تحدث مع إيماءات</option>
                <option value="cinematic">سينمائي بطيء</option>
                <option value="walking">مشي طبيعي</option>
              </select>
            </div>

            {(upscaledImages.length > 0 || datasetImages.length > 0) && (
              <div className="mb-4">
                <label className="block text-sm mb-2">اختر صورة:</label>
                <div className="grid grid-cols-5 gap-2">
                  {(upscaledImages.length > 0 ? upscaledImages : datasetImages).map((img, i) => (
                    <img
                      key={i}
                      src={img.url}
                      alt={`Select ${i}`}
                      className={`w-full aspect-square object-cover rounded-lg cursor-pointer ${
                        selectedImage === img.image ? 'ring-4 ring-primary' : ''
                      }`}
                      onClick={() => setSelectedImage(img.image)}
                    />
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={generateMotion}
              disabled={loading}
              className="w-full py-3 rounded-lg font-bold bg-primary text-white disabled:bg-gray-700"
            >
              {loading ? 'جاري التوليد...' : '🎬 توليد الفيديو'}
            </button>
          </div>
        )}

        {/* STEP 6: Assembly */}
        {currentStep === 6 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">📦 الخطوة 6: التجميع النهائي</h2>
            <p className="text-gray-400 mb-4">حمّل الأصول وأنشئ الفيديو النهائي</p>

            {/* Show all generated images */}
            {(upscaledImages.length > 0 || datasetImages.length > 0) && (
              <div className="mb-6">
                <p className="text-sm text-gray-400 mb-2">الصور المتاحة للتحميل:</p>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-4 mb-4">
                  {(upscaledImages.length > 0 ? upscaledImages : datasetImages).map((img, i) => (
                    <a key={i} href={img.url} download={`clone_${img.name || i}.jpg`} target="_blank">
                      <img
                        src={img.url}
                        alt={img.name}
                        className="w-full aspect-square object-cover rounded-lg hover:ring-2 hover:ring-primary cursor-pointer"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-4 bg-darker rounded-lg">
                <h3 className="font-bold mb-3">📥 تحميل الأصول</h3>
                <button
                  onClick={downloadAllImages}
                  className="w-full py-2 mb-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  تحميل كل الصور ({upscaledImages.length || datasetImages.length})
                </button>
                {videoData && (
                  <a
                    href={`data:video/mp4;base64,${videoData}`}
                    download="motion.mp4"
                    className="block w-full py-2 text-center rounded bg-purple-600 text-white hover:bg-purple-700"
                  >
                    تحميل الفيديو
                  </a>
                )}
              </div>

              <div className="p-4 bg-darker rounded-lg">
                <h3 className="font-bold mb-3">🛠️ أدوات التجميع</h3>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li>• <a href="https://www.capcut.com" target="_blank" className="text-primary hover:underline">CapCut</a> - مجاني وسهل</li>
                  <li>• <a href="https://www.canva.com" target="_blank" className="text-primary hover:underline">Canva</a> - تصميم + فيديو</li>
                  <li>• <a href="https://runwayml.com" target="_blank" className="text-primary hover:underline">Runway</a> - AI متقدم</li>
                  <li>• <a href="https://klingai.com" target="_blank" className="text-primary hover:underline">Kling AI</a> - حركة واقعية</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 p-4 bg-green-900/30 rounded-lg text-center">
              <p className="text-xl mb-2">🎉 مبروك!</p>
              <p className="text-gray-400">أصولك جاهزة لإنشاء محتوى AI احترافي</p>
            </div>
          </div>
        )}
      </div>

      {/* Supabase Setup Info */}
      {!supabaseUrl && !supabaseKey && (
        <div className="card mt-6 bg-yellow-900/20 border border-yellow-700">
          <h3 className="font-bold mb-2">⚠️ إعداد Supabase (موصى به)</h3>
          <p className="text-sm text-gray-400 mb-3">لحفظ الصور بشكل دائم وتحميلها لاحقاً:</p>
          <ol className="text-sm text-gray-400 list-decimal list-inside space-y-1">
            <li>أنشئ مشروع مجاني في <a href="https://supabase.com" target="_blank" className="text-primary">supabase.com</a></li>
            <li>اذهب إلى Storage وأنشئ bucket باسم <code className="bg-black px-1 rounded">ai-clone-images</code></li>
            <li>اجعل الـ bucket عام (public)</li>
            <li>انسخ Project URL و anon key من Settings → API</li>
          </ol>
        </div>
      )}

      {/* Footer */}
      <div className="text-center mt-8 text-gray-500 text-sm">
        <p>Based on NICOLA.AI Workflow</p>
        <a href="https://github.com/osama0561/ai_clone_studio" target="_blank" className="text-primary hover:underline">GitHub</a>
      </div>
    </main>
  );
}
