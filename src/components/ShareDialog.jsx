import React, { useState, useEffect } from 'react';
import { X, Download, Share2, Copy, Send, MessageCircle, Instagram, Facebook, Loader2 } from 'lucide-react';
import { downloadImage, generateCardImage } from '../utils/shareUtils';
import { useToast } from '../context/ToastContext';

const ShareDialog = ({ isOpen, onClose, cardRef, title, caption }) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { showToast } = useToast();

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
    await new Promise(r => setTimeout(r, 150));
    
    const element = cardRef.current;
    if (element) {
      element.classList.add('is-exporting');
      // Hide internal elements
      const elementsToHide = element.querySelectorAll('.no-export, .card-action-menu-trigger, .btn-action, .action-buttons, .fab-button, .dropdown, .interactive-element');
      elementsToHide.forEach(el => el.style.setProperty('display', 'none', 'important'));
    }
    
    try {
      const url = await generateCardImage(element);
      if (!url) {
        throw new Error("Render canvas returned empty url.");
      }
      setImageUrl(url);
    } catch (err) {
      console.error("Export error:", err);
      showToast("Gagal menghasilkan gambar kartu, silakan gunakan Salin Teks.", "error");
    } finally {
      if (element) {
        element.classList.remove('is-exporting');
        const elementsToHide = element.querySelectorAll('.no-export, .card-action-menu-trigger, .btn-action, .action-buttons, .fab-button, .dropdown, .interactive-element');
        elementsToHide.forEach(el => el.style.removeProperty('display'));
      }
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  const handleCopyText = async (isFallback = false) => {
    if (!caption) return;
    try {
      await navigator.clipboard.writeText(caption);
      if (isFallback) {
        showToast("Gambar disimpan & keterangan disalin ke clipboard!", "success");
      } else {
        showToast("Keterangan berhasil disalin ke clipboard!", "success");
      }
    } catch (error) {
      console.error('Error copying text:', error);
      showToast("Gagal menyalin teks ke clipboard.", "error");
    }
  };

  const handleNativeShare = async () => {
    if (!imageUrl) {
      showToast("Gambar belum siap. Menyalin teks saja...", "warning");
      await handleCopyText();
      return;
    }
    
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error("Gagal mengambil data URL gambar.");
      const blob = await response.blob();
      if (!blob || blob.size === 0) throw new Error("Blob gambar tidak valid.");
      
      const cleanTitle = title ? title.replace(/[^a-zA-Z0-9]/g, '_') : 'KeuanganApp';
      const file = new File([blob], `${cleanTitle}.jpg`, { type: 'image/jpeg' });
      
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: title || "Bagikan",
            text: caption || "",
          });
          showToast("Berhasil dibagikan!", "success");
        } catch (shareError) {
          if (shareError.name === 'AbortError') {
            showToast("Berbagi dibatalkan", "info");
          } else {
            console.error("Native share error, falling back...", shareError);
            downloadImage(imageUrl, cleanTitle);
            await handleCopyText(true);
          }
        }
      } else {
        downloadImage(imageUrl, cleanTitle);
        await handleCopyText(true);
      }
    } catch (error) {
      console.error('Error sharing:', error);
      showToast("Gagal membagikan. Menyimpan gambar & menyalin teks...", "error");
      const cleanTitle = title ? title.replace(/[^a-zA-Z0-9]/g, '_') : 'KeuanganApp';
      downloadImage(imageUrl, cleanTitle);
      await handleCopyText(true);
    }
  };

  const shareWithImage = async (fallbackUrl, platformName) => {
    const cleanTitle = title ? title.replace(/[^a-zA-Z0-9]/g, '_') : 'KeuanganApp';
    
    if (navigator.share && imageUrl) {
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], `${cleanTitle}.jpg`, { type: 'image/jpeg' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: title || "Bagikan",
              text: caption || "",
            });
            showToast(`Berhasil dibagikan ke ${platformName}!`, "success");
            return;
          } catch (shareError) {
            if (shareError.name === 'AbortError') {
              showToast("Berbagi dibatalkan", "info");
              return;
            }
          }
        }
      } catch (error) {
        console.error('Native share error:', error);
      }
    }
    
    if (caption) {
      try {
        await navigator.clipboard.writeText(caption);
        showToast(`Teks disalin! Silakan tempel di ${platformName}.`, "success");
      } catch (e) {
        console.error("Could not auto copy caption:", e);
      }
    }
    
    if (fallbackUrl) {
      window.open(fallbackUrl, '_blank');
    } else {
      if (imageUrl) downloadImage(imageUrl, cleanTitle);
    }
  };

  const socialActions = [
    { 
      name: 'WhatsApp', 
      icon: MessageCircle, 
      color: 'bg-emerald-500', 
      onClick: () => shareWithImage(`https://wa.me/?text=${encodeURIComponent(caption || title)}`, 'WhatsApp')
    },
    { 
      name: 'Telegram', 
      icon: Send, 
      color: 'bg-blue-500', 
      onClick: () => shareWithImage(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(caption || title)}`, 'Telegram')
    },
    { 
      name: 'Instagram', 
      icon: Instagram, 
      color: 'bg-pink-600', 
      onClick: () => shareWithImage(null, 'Instagram')
    },
    { 
      name: 'Facebook', 
      icon: Facebook, 
      color: 'bg-blue-700', 
      onClick: () => shareWithImage(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, 'Facebook')
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-[#0c1220] border border-[#1e2d45] rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-5 py-4 border-b border-[#1e2d45]">
          <h3 className="text-sm font-bold text-white tracking-tight">Bagikan Kartu Keuangan</h3>
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
                  <button onClick={() => downloadImage(imageUrl, title ? title.replace(/[^a-zA-Z0-9]/g, '_') : 'KeuanganApp')} className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all border border-white/20">
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
                onClick={() => handleCopyText(false)}
                disabled={isGenerating || !caption}
                className="flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-2xl text-xs font-bold border border-slate-700 transition-all active:scale-95"
              >
                <Copy size={16} /> Salin Teks
              </button>
              <button 
                onClick={() => downloadImage(imageUrl, title ? title.replace(/[^a-zA-Z0-9]/g, '_') : 'KeuanganApp')}
                disabled={isGenerating || !imageUrl}
                className="flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-2xl text-xs font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-95"
              >
                <Download size={16} /> Simpan JPG
              </button>
            </div>

            <button 
              onClick={handleNativeShare}
              disabled={isGenerating || !imageUrl}
              className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-2xl text-xs font-bold border border-white/10 transition-all"
            >
              <Share2 size={16} /> Berbagi Lainnya (Share)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareDialog;
