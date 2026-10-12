import { initialsOf } from "../utils/avatar";

export default function Avatar({ src, name, size = 36, className = "", ring = false }) {
  const style = { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.38)) };
  const ringCls = ring ? "ring-2 ring-blue-500/40 ring-offset-2 ring-offset-[#0c1220]" : "";

  if (src) {
    return (
      <img
        src={src}
        alt={name ? `Foto profil ${name}` : "Foto profil"}
        style={style}
        className={`rounded-full object-cover border border-white/10 shrink-0 ${ringCls} ${className}`}
      />
    );
  }

  return (
    <span
      style={style}
      aria-hidden="true"
      className={`rounded-full bg-blue-600/20 text-blue-300 font-bold flex items-center justify-center shrink-0 border border-blue-500/20 select-none ${ringCls} ${className}`}
    >
      {initialsOf(name)}
    </span>
  );
}
