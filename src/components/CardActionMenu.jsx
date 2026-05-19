import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Pin, Share2, Copy, Archive, Check, Download } from 'lucide-react';
import { copyToClipboard, generateCardImage } from '../utils/shareUtils';

const CardActionMenu = ({ 
  item, 
  onTogglePin, 
  onShare, 
  cardRef,
  dataString,
  title,
  caption   // structured text for sharing
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopy = async () => {
    const success = await copyToClipboard(dataString);
    if (success) {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setIsOpen(false);
      }, 1500);
    }
  };

  const handleShareClick = () => {
    setIsOpen(false);
    if (cardRef && cardRef.current) {
      onShare(cardRef, title, caption);
    }
  };

  return (
    <div className="relative no-export" ref={menuRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className={`p-1 rounded-md transition-all ${isOpen ? 'bg-white/10 text-white' : 'text-slate-600 hover:text-slate-400 hover:bg-white/5'} card-action-menu-trigger`}
      >
        <MoreVertical size={16} />
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 top-full mt-1 w-40 bg-[#0e1523] border border-[#1e2d45] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 origin-top-right"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { onTogglePin(item.id); setIsOpen(false); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-slate-300 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
          >
            <Pin size={14} className={item.isPinned ? 'fill-current' : ''} />
            {item.isPinned ? 'Lepas Pin' : 'Pin Item'}
          </button>
          
          <button
            onClick={handleShareClick}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
          >
            <Share2 size={14} />
            Bagikan
          </button>

          <button
            onClick={handleCopy}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-slate-300 hover:text-orange-400 hover:bg-orange-500/10 transition-colors"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            {copied ? 'Tersalin!' : 'Salin Data'}
          </button>

          <button
            onClick={() => setIsOpen(false)}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-slate-300 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
          >
            <Archive size={14} />
            Arsipkan
          </button>
        </div>
      )}
    </div>
  );
};

export default CardActionMenu;
