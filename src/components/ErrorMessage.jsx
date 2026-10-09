import { AlertCircle } from 'lucide-react';

/**
 * Reusable inline error message component.
 *
 * @param {{ message?: string, className?: string }} props
 */
export default function ErrorMessage({ message, className = '' }) {
  if (!message) return null;

  return (
    <div
      className={`flex items-center gap-1.5 text-xs text-rose-400 mt-1.5 animate-fadeIn ${className}`}
      role="alert"
    >
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}
