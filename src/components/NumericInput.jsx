import { useState, useRef, useEffect } from "react";
import { Delete, Check } from "lucide-react";

export default function NumericInput({ 
  value, 
  onChange, 
  placeholder = "0", 
  label, 
  required = false 
}) {
  const [showKeypad, setShowKeypad] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Close keypad when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        // We only close if they didn't click on the fixed keypad
        const keypad = document.getElementById("custom-numeric-keypad");
        if (keypad && keypad.contains(event.target)) return;
        setShowKeypad(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll into view when opened so input isn't hidden by keyboard
  useEffect(() => {
    if (showKeypad && inputRef.current) {
      setTimeout(() => {
        inputRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
    }
  }, [showKeypad]);

  // Parse string back to number format just for display
  const numericValue = value ? value.toString().replace(/\D/g, "") : "";
  const formattedValue = numericValue 
    ? new Intl.NumberFormat("id-ID").format(parseInt(numericValue))
    : "";

  const handleInputChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    if (rawValue.length > 14) return;
    onChange(rawValue);
  };

  const handleKeypadPress = (key) => {
    let currentVal = numericValue;
    
    if (key === "delete") {
      currentVal = currentVal.slice(0, -1);
    } else if (key === "clear") {
      currentVal = "";
    } else if (key === "done") {
      setShowKeypad(false);
      inputRef.current?.blur();
      return;
    } else {
      if (currentVal.length > 14) return;
      if (currentVal === "0" && key !== "0") {
        currentVal = key;
      } else if (currentVal === "0" && key === "0") {
        currentVal = "0";
      } else {
        currentVal += key;
      }
    }
    
    onChange(currentVal);
    // Keep focus on input
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col gap-1.5 w-full relative" ref={containerRef}>
      {label && (
        <label className="text-xs font-medium text-slate-400">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div 
        className={`relative flex items-center bg-[#141d2e]/50 border rounded-xl transition-all shadow-inner ${
          showKeypad 
            ? "border-blue-500/50 bg-[#141d2e] ring-4 ring-blue-500/10" 
            : "border-[#1e2d45] hover:border-slate-600"
        }`}
      >
        <span className="pl-4 pr-2 text-slate-500 font-bold text-sm select-none">Rp</span>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={formattedValue}
          onChange={handleInputChange}
          onFocus={() => setShowKeypad(true)}
          placeholder={placeholder}
          className="w-full py-3.5 pr-4 bg-transparent text-white text-xl font-bold tracking-tight outline-none placeholder-slate-600"
        />
        {numericValue && showKeypad && (
           <button 
             type="button"
             onMouseDown={(e) => {
               e.preventDefault(); 
               onChange(""); 
               inputRef.current?.focus();
             }}
             className="absolute right-3 w-6 h-6 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors shrink-0"
           >
              <span className="text-xs">×</span>
           </button>
        )}
      </div>

      {showKeypad && (
        <div 
          id="custom-numeric-keypad"
          className="fixed bottom-0 left-0 right-0 z-[100] bg-[#0a0f1a] border-t border-[#1e2d45] shadow-[0_-10px_40px_rgba(0,0,0,0.4)] animate-in slide-in-from-bottom duration-300 pb-safe"
          onMouseDown={(e) => e.preventDefault()}
        >
           {/* Header/Toolbar */}
           <div className="flex justify-end items-center px-4 py-2 bg-[#141d2e] border-b border-[#1e2d45]">
              <button 
                 type="button"
                 onMouseDown={(e) => { e.preventDefault(); handleKeypadPress('done'); }}
                 className="text-blue-400 font-semibold text-sm py-1.5 px-4 rounded-lg hover:bg-blue-500/10 active:scale-95 transition-all flex items-center gap-1.5"
              >
                 <Check size={16} /> Selesai
              </button>
           </div>

           {/* Keypad Grid */}
           <div className="p-3 sm:p-4 max-w-md mx-auto grid grid-cols-3 gap-2">
              {['1','2','3','4','5','6','7','8','9','00','0'].map(num => (
                <button 
                  key={num} 
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleKeypadPress(num); }}
                  className="bg-[#141d2e]/50 hover:bg-[#1e2d45] text-white text-2xl font-medium py-3.5 sm:py-4 rounded-xl transition-colors active:bg-blue-600/30 active:scale-95 border border-[#1e2d45] shadow-sm"
                >
                  {num}
                </button>
              ))}
              <button 
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleKeypadPress('delete'); }}
                className="bg-[#141d2e]/50 hover:bg-red-500/10 text-slate-400 hover:text-red-400 flex items-center justify-center py-3.5 sm:py-4 rounded-xl transition-colors active:bg-red-500/20 active:scale-95 border border-[#1e2d45] shadow-sm"
              >
                <Delete size={24} />
              </button>
           </div>
        </div>
      )}
    </div>
  );
}
