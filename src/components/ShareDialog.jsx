import React, { useState, useEffect } from 'react';
import { X, Download, Share2, Copy, Send, MessageCircle, Instagram, Facebook, Loader2 } from 'lucide-react';
import { downloadImage, generateCardImage } from '../utils/shareUtils';

const ShareDialog = ({ isOpen, onClose, cardRef, title }) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (isOpen && cardRef?.current) {
      handleGenerate();
    } else if (!isOpen) {
      setImageUrl(null);
      setIsGenerating(false);
    }
  }, [isOpen, cardRef]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    // Small delay to ensure any open menus are closed
    await new Promise(r => setTimeout(r, 100));
    
    // Add export class to show full content
    const element = cardRef.current;
    if (element) element.classList.add('is-exporting');
    
    try {
      const url = await generateCardImage(element);
      setImageUrl(url);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      if (element) element.classList.remove('is-exporting');
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  const handleNativeShare = async () => {
    if (!imageUrl) return;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], `${title.replace(/\s+/g, '_')}.jpg`, { type: 'image/jpeg' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Bagikan Data Keuangan',
          text: title,
        });
      } else {
        downloadImage(imageUrl, title);
      }
    } catch (error) {
      console.error('Error sharing:', error);
      downloadImage(imageUrl, title);
    }
  };

  const handleCopyImage = async () => {
    if (!imageUrl) return;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const item = new ClipboardItem({ 'image/png': blob }); 
      await navigator.clipboard.write([item]);
      alert('Gambar berhasil disalin!');
    } catch (error) {
      console.error('Error copying image:', error);
      alert('Gagal menyalin gambar.');
    }
  };

  const socialActions = [
    { 
      name: 'WhatsApp', 
      icon: MessageCircle, 
      color: 'bg-emerald-500', 
      onClick: () => window.open(`https://wa.me/?text=${encodeURIComponent(title)}`, '_blank') 
    },
    { 
      name: 'Telegram', 
      icon: Send, 
      color: 'bg-blue-500', 
      onClick: () => window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(title)}`, '_blank') 
    },
    { 
      name: 'Instagram', 
      icon: Instagram, 
      color: 'bg-pink-600', 
      onClick: handleCopyImage 
    },
    { 
      name: 'Facebook', 
      icon: Facebook, 
      color: 'bg-blue-700', 
      onClick: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank') 
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-[#0c1220] border border-[#1e2d45] rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-5 py-4 border-b border-[#1e2d45]">
          <h3 className="text-sm font-bold text-white tracking-tight">Bagikan Kartu</h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          {/* Image Preview / Loader */}
          <div className="relative aspect-[4/3] bg-[#0a0f1a] rounded-2xl overflow-hidden border border-[#1e2d45] mb-5 shadow-inner flex items-center justify-center group">
            {isGenerating ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 size={32} className="text-blue-500 animate-spin" />
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Menyiapkan Gambar...</span>
              </div>
            ) : imageUrl ? (
              <>
                <img src={imageUrl} alt="Preview" className="w-full h-full object-contain p-2" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button onClick={() => downloadImage(imageUrl, title)} className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all border border-white/20">
                    <Download size={24} />
                  </button>
                </div>
              </>
            ) : (
              <span className="text-xs text-slate-600">Gagal memuat pratinjau</span>
            )}
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-3">
              {socialActions.map((action) => (
                <button 
                  key={action.name}
                  onClick={action.onClick}
                  disabled={isGenerating}
                  className="flex flex-col items-center gap-2 group disabled:opacity-50"
                >
                  <div className={`w-12 h-12 ${action.color} rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform group-active:scale-95`}>
                    <action.icon size={22} />
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold tracking-tight">{action.name}</span>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={handleCopyImage}
                disabled={isGenerating || !imageUrl}
                className="flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-2xl text-xs font-bold border border-slate-700 transition-all active:scale-95"
              >
                <Copy size={16} /> Salin Gambar
              </button>
              <button 
                onClick={() => downloadImage(imageUrl, title)}
                disabled={isGenerating || !imageUrl}
                className="flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-2xl text-xs font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-95"
              >
                <Download size={16} /> Simpan JPG
              </button>
            </div>

            {navigator.share && (
              <button 
                onClick={handleNativeShare}
                disabled={isGenerating || !imageUrl}
                className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-2xl text-xs font-bold border border-white/10 transition-all"
              >
                <Share2 size={16} /> Berbagi Lainnya
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareDialog;
