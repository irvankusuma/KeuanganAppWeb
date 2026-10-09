import React from 'react';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../utils/categories';

/**
 * CategoryPicker — visual emoji + color grid for selecting a transaction category.
 *
 * @param {{ value: string, onChange: (id: string) => void, type?: 'expense'|'income', error?: string }} props
 */
export default function CategoryPicker({ value, onChange, type = 'expense', error }) {
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div>
      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
        Kategori <span className="text-red-400">*</span>
      </label>
      <div className="grid grid-cols-4 gap-2">
        {categories.map((cat) => {
          const isSelected = value === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onChange(cat.id)}
              title={cat.name}
              style={isSelected ? {
                borderColor: cat.color,
                backgroundColor: `${cat.color}18`,
              } : {}}
              className={`
                flex flex-col items-center justify-center p-2.5 rounded-xl border-2 transition-all duration-150 select-none
                ${isSelected
                  ? 'border-current shadow-sm scale-[1.04]'
                  : 'border-[#1e2d45] hover:border-slate-500 hover:bg-white/[0.03]'
                }
              `}
            >
              <span className="text-lg leading-none mb-1" role="img" aria-label={cat.name}>
                {cat.emoji}
              </span>
              <span className={`text-[9px] font-semibold text-center leading-tight line-clamp-2 ${
                isSelected ? 'text-white' : 'text-slate-400'
              }`}>
                {cat.name}
              </span>
            </button>
          );
        })}
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  );
}
