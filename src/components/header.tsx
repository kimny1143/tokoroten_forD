import React from 'react';
import { ThemeToggle } from './theme-toggle';
import { SettingsToggle } from './settings-toggle';
import { LanguageToggle } from './language-toggle';
import { useLanguage } from './language-provider';
import appIcon from '../assets/crow_white1.png';

interface HeaderProps {
  isSettingsOpen: boolean;
  onSettingsToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isSettingsOpen,
  onSettingsToggle,
}) => {
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center space-x-2">
          <img
            src={appIcon}
            alt="Tokoroten Logo"
            className="w-10 h-10 object-contain dark:invert-0 invert"
          />
          <span className="font-bold">
            {t('app.title')}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <LanguageToggle />
          <ThemeToggle />
          <SettingsToggle isOpen={isSettingsOpen} onToggle={onSettingsToggle} />
        </div>
      </div>
    </header>
  );
}; 