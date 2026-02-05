'use client';

import { useState } from 'react';

export default function Home() {
  const [apiKey, setApiKey] = useState('');
  const [activeTab, setActiveTab] = useState('upload');
  const [uploadedImage, setUploadedImage] = useState(null);
  const [uploadedImageBase64, setUploadedImageBase64] = useState(null);
  const [generatedFaces, setGeneratedFaces] = useState([]);
  const [script, setScript] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [numVariations, setNumVariations] = useState(5);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedImage(URL.createObjectURL(file));

      // Convert to base64 for API
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImageBase64(reader.result.split(',')[1]);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateFaces = async () => {
    if (!apiKey) {
      setStatus('يرجى إدخال مفتاح Gemini API');
      return;
    }
    if (!uploadedImageBase64) {
      setStatus('يرجى رفع صورة أولاً');
      return;
    }

    setLoading(true);
    setStatus('جاري توليد الصور...');
    setGeneratedFaces([]);

    try {
      const response = await fetch('/api/generate-faces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          imageBase64: uploadedImageBase64,
          numVariations
        }),
      });

      const data = await response.json();

      if (data.success) {
        setGeneratedFaces(data.images);
        setStatus(`تم توليد ${data.images.length} صورة بنجاح!`);
      } else {
        setStatus(`خطأ: ${data.error}`);
      }
    } catch (error) {
      setStatus(`خطأ: ${error.message}`);
    }

    setLoading(false);
  };

  const tabs = [
    { id: 'upload', label: 'رفع الصورة', icon: '📸' },
    { id: 'voice', label: 'الصوت', icon: '🎤' },
    { id: 'video', label: 'الفيديو', icon: '🎬' },
    { id: 'export', label: 'التصدير', icon: '📦' },
  ];

  return (
    <main className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          🎬 AI Clone Studio
        </h1>
        <p className="text-gray-400">
          حوّل صورتك إلى فيديو AI احترافي
          <br />
          <span className="text-sm">Transform your selfie into professional AI videos</span>
        </p>
      </div>

      {/* API Key Input */}
      <div className="max-w-md mx-auto mb-8">
        <div className="card">
          <label className="block text-sm mb-2">🔑 Gemini API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="أدخل مفتاح API..."
            className="w-full p-3 rounded-lg bg-darker border border-gray-700 text-white focus:border-primary focus:outline-none"
          />
          {apiKey && <p className="text-green-400 text-sm mt-2">✅ تم إدخال المفتاح</p>}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center gap-2 mb-8 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-primary text-white'
                : 'bg-card text-gray-400 hover:bg-gray-700'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Status Message */}
      {status && (
        <div className="max-w-2xl mx-auto mb-4">
          <div className={`p-3 rounded-lg text-center ${
            status.includes('خطأ') ? 'bg-red-900/50 text-red-300' : 'bg-blue-900/50 text-blue-300'
          }`}>
            {status}
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="max-w-4xl mx-auto">
        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div className="card">
            <h2 className="text-2xl font-bold mb-4">📸 الخطوة ١: ارفع صورتك</h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block mb-4">
                  <span className="text-gray-400 mb-2 block">اختر صورة واضحة لوجهك</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="block w-full text-sm text-gray-400
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-sm file:font-semibold
                      file:bg-primary file:text-white
                      hover:file:bg-blue-600
                      cursor-pointer"
                  />
                </label>

                {uploadedImage && (
                  <img
                    src={uploadedImage}
                    alt="Uploaded"
                    className="w-48 h-48 object-cover rounded-lg border border-gray-700"
                  />
                )}
              </div>

              <div>
                <label className="block mb-4">
                  <span className="text-gray-400 mb-2 block">عدد الصور المتنوعة</span>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={numVariations}
                    onChange={(e) => setNumVariations(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-primary font-bold">{numVariations}</span>
                </label>

                <button
                  onClick={generateFaces}
                  disabled={loading || !uploadedImage}
                  className={`w-full py-3 px-6 rounded-lg font-bold transition-all ${
                    loading || !uploadedImage
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-primary text-white hover:bg-blue-600'
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="spinner w-5 h-5"></div>
                      جاري التوليد...
                    </span>
                  ) : (
                    '🎨 توليد صور الوجه'
                  )}
                </button>
              </div>
            </div>

            {/* Generated Faces */}
            {generatedFaces.length > 0 && (
              <div className="mt-6">
                <h3 className="text-xl font-bold mb-4">🎭 الصور المولدة</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {generatedFaces.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={`data:image/jpeg;base64,${img}`}
                        alt={`Generated ${idx + 1}`}
                        className="w-full aspect-square object-cover rounded-lg border border-gray-700"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <a
                          href={`data:image/jpeg;base64,${img}`}
                          download={`face_${idx + 1}.jpg`}
                          className="bg-primary px-3 py-1 rounded text-sm"
                        >
                          تحميل
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Voice Tab */}
        {activeTab === 'voice' && (
          <div className="card">
            <h2 className="text-2xl font-bold mb-4">🎤 الخطوة ٢: توليد الصوت</h2>

            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="اكتب النص العربي هنا..."
              className="w-full h-40 p-4 rounded-lg bg-darker border border-gray-700 text-white focus:border-primary focus:outline-none resize-none"
            />

            <button
              onClick={() => setStatus('سيتم إضافة توليد الصوت قريباً')}
              className="mt-4 py-3 px-6 rounded-lg font-bold bg-primary text-white hover:bg-blue-600 transition-all"
            >
              🔊 توليد الصوت
            </button>

            <p className="text-gray-500 text-sm mt-4">
              * سيتم استخدام Google TTS لتوليد الصوت العربي
            </p>
          </div>
        )}

        {/* Video Tab */}
        {activeTab === 'video' && (
          <div className="card">
            <h2 className="text-2xl font-bold mb-4">🎬 الخطوة ٣: توليد الفيديو</h2>

            <p className="text-gray-400 mb-4">
              سيتم دمج الصور المولدة مع الصوت لإنشاء فيديو بتأثير Ken Burns
            </p>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-400 mb-2">مدة كل صورة (ثواني)</label>
                <input
                  type="number"
                  min="2"
                  max="10"
                  defaultValue="4"
                  className="w-full p-3 rounded-lg bg-darker border border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-2">نوع الانتقال</label>
                <select className="w-full p-3 rounded-lg bg-darker border border-gray-700 text-white">
                  <option>تكبير بطيء</option>
                  <option>تصغير بطيء</option>
                  <option>تحريك يمين</option>
                  <option>تحريك يسار</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => setStatus('سيتم إضافة توليد الفيديو قريباً')}
              className="py-3 px-6 rounded-lg font-bold bg-primary text-white hover:bg-blue-600 transition-all"
            >
              🎥 توليد الفيديو
            </button>
          </div>
        )}

        {/* Export Tab */}
        {activeTab === 'export' && (
          <div className="card">
            <h2 className="text-2xl font-bold mb-4">📦 الخطوة ٤: التصدير</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {['YouTube', 'TikTok', 'Reels', 'Shorts'].map((platform) => (
                <label key={platform} className="flex items-center gap-2 p-3 rounded-lg bg-darker border border-gray-700 cursor-pointer hover:border-primary transition-all">
                  <input type="checkbox" defaultChecked={platform === 'YouTube'} className="accent-primary" />
                  <span>{platform}</span>
                </label>
              ))}
            </div>

            <button
              onClick={() => setStatus('سيتم إضافة التصدير قريباً')}
              className="py-3 px-6 rounded-lg font-bold bg-green-600 text-white hover:bg-green-700 transition-all"
            >
              📥 تصدير الفيديو النهائي
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center mt-12 text-gray-500 text-sm">
        <p>AI Clone Studio - Built with Next.js & Gemini</p>
        <a
          href="https://github.com/osama0561/ai_clone_studio"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          GitHub
        </a>
      </div>
    </main>
  );
}
