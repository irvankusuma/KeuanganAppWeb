import html2canvas from 'html2canvas';

export const generateCardImage = async (element) => {
  if (!element) return null;
  
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#0c1220',
      logging: false,
      ignoreElements: (node) => {
        if (node.classList) {
          const skipClasses = [
            'card-action-menu-trigger',
            'btn-action',
            'action-buttons',
            'no-export',
            'fab-button',
            'dropdown',
            'interactive-element'
          ];
          if (skipClasses.some(cls => node.classList.contains(cls))) return true;
        }
        return false;
      }
    });
    
    return canvas.toDataURL('image/jpeg', 0.85);
  } catch (error) {
    console.error('Error generating card image:', error);
    throw error;
  }
};

export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy text: ', err);
    return false;
  }
};

export const shareToWhatsApp = (text) => {
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
};

export const shareToTelegram = (text) => {
  window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(text)}`, '_blank');
};

export const downloadImage = (dataUrl, filename) => {
  const link = document.createElement('a');
  link.download = `${filename}.jpg`;
  link.href = dataUrl;
  link.click();
};
