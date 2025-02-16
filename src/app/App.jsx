import React, { useState } from 'react';
import { ThemeProvider } from '../components/theme-provider';
import { ThemeToggle } from '../components/theme-toggle';
import { SettingsToggle } from '../components/settings-toggle';
import { PdfCsvTab } from '../components/pdf-csv-tab';
import { AudioTab } from '../components/audio-tab';
import { SettingsTab } from '../components/settings-tab';

const App = () => {
  const [activeTab, setActiveTab] = useState('pdf-csv');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="tokoroten-ui-theme">
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-slate-50 dark:from-slate-900 dark:to-slate-800 dark:text-slate-50 light:from-slate-100 light:to-slate-200 light:text-slate-900">
        <header className="border-b border-slate-700 p-4 dark:border-slate-700 light:border-slate-300">
          <div className="container mx-auto flex items-center justify-between">
            <h1 className="text-2xl font-bold">Tokoroten Audio Processor</h1>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <SettingsToggle
                isOpen={isSettingsOpen}
                onToggle={() => setIsSettingsOpen(!isSettingsOpen)}
              />
            </div>
          </div>
        </header>

        <main className="container mx-auto p-4">
          {!isSettingsOpen ? (
            <div className="grid gap-4">
              <div className="flex space-x-4">
                <button
                  onClick={() => setActiveTab('pdf-csv')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'pdf-csv'
                      ? 'bg-blue-600 text-white dark:bg-blue-600 light:bg-blue-500'
                      : 'bg-slate-700 text-slate-200 hover:bg-slate-600 dark:bg-slate-700 dark:text-slate-200 light:bg-slate-300 light:text-slate-700'
                  }`}
                >
                  PDF/CSV変換
                </button>
                <button
                  onClick={() => setActiveTab('audio')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'audio'
                      ? 'bg-blue-600 text-white dark:bg-blue-600 light:bg-blue-500'
                      : 'bg-slate-700 text-slate-200 hover:bg-slate-600 dark:bg-slate-700 dark:text-slate-200 light:bg-slate-300 light:text-slate-700'
                  }`}
                >
                  音声処理
                </button>
              </div>
              
              <div className="bg-slate-800 rounded-lg p-6 shadow-lg dark:bg-slate-800 light:bg-white">
                {activeTab === 'pdf-csv' ? (
                  <PdfCsvTab />
                ) : (
                  <AudioTab />
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-800 rounded-lg p-6 shadow-lg dark:bg-slate-800 light:bg-white">
              <SettingsTab />
            </div>
          )}
        </main>
      </div>
    </ThemeProvider>
  );
};

export default App; 