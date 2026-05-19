import { useRef } from "react";

export default function NumericInput({ 
  value, 
  onChange, 
  placeholder = "0", 
  label, 
  required = false 
}) {
  const inputRef = useRef(null);

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

  return (
    <div className="flex flex-col gap-1.5 w-full relative">
      {label && (
        <label className="text-xs font-bold text-slate-400 block">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div 
        className="relative flex items-center bg-[#141d2e]/50 border border-[#1e2d45] rounded-xl transition-all hover:border-slate-600 focus-within:border-blue-500/50 focus-within:bg-[#141d2e] focus-within:ring-4 focus-within:ring-blue-500/10 shadow-inner"
      >
        <span className="pl-4 pr-2 text-slate-500 font-bold text-sm select-none">Rp</span>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={formattedValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="w-full py-3.5 pr-4 bg-transparent text-white text-xl font-bold tracking-tight outline-none placeholder-slate-600"
          required={required}
        />
        {numericValue && (
          <button 
            type="button"
            onClick={() => {
              onChange(""); 
              inputRef.current?.focus();
            }}
            className="absolute right-3 w-6 h-6 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors shrink-0"
            title="Hapus Nilai"
          >
            <span className="text-xs font-bold">×</span>
          </button>
        )}
      </div>
    </div>
  );
}
