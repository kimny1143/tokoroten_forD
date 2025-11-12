import React from 'react';
import { useLanguage } from './language-provider';

interface LanguageToggleProps {
  className?: string;
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({ className = '' }) => {
  const { language, setLanguage } = useLanguage();

  return (
    <button
      onClick={() => setLanguage(language === 'ja' ? 'en' : 'ja')}
      className={`p-2 rounded-lg hover:bg-slate-700 transition-colors ${className}`}
      aria-label={`Switch to ${language === 'en' ? '日本語' : 'English'}`}
    >
      <span className="text-sm font-medium">
        {language === 'ja' ? 'JA' : 'EN'}
      </span>
    </button>
  );
}; 