import { toJpeg } from 'html-to-image';

export const generateCardImage = async (element) => {
  if (!element) return null;
  
  try {
    // Advanced filtering to exclude non-data elements
    const filter = (node) => {
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
        if (skipClasses.some(cls => node.classList.contains(cls))) return false;
      }
      return true;
    };

    // Fast generation with optimized settings
    const dataUrl = await toJpeg(element, {
      quality: 0.85,
      pixelRatio: 2, // Sharpness without excessive weight
      backgroundColor: '#0c1220',
      filter: filter,
      cacheBust: true,
      includeGraphics: true,
      fontEmbedCSS: true,
      style: {
        padding: '16px',
        borderRadius: '16px',
        boxShadow: 'none',
        transform: 'scale(1)',
      }
    });
    
    return dataUrl;
  } catch (error) {
    console.error('Error generating card image:', error);
    return null;
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
