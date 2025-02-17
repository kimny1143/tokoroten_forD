import React, { useState } from 'react';
import { Header } from '../components/header';
import { PdfCsvTab } from '../components/pdf-csv-tab';
import { AudioTab } from '../components/audio-tab';
import { SettingsTab } from '../components/settings-tab';
import * as Tabs from '@radix-ui/react-tabs';
import { useLanguage } from '../components/language-provider';

type TabType = 'pdf-csv' | 'audio';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('pdf-csv');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-700 via-blue-700 to-slate-800">
      <div className="min-h-screen bg-background/30 backdrop-blur-[2px] supports-[backdrop-filter]:bg-background/20">
        <Header
          isSettingsOpen={isSettingsOpen}
          onSettingsToggle={() => setIsSettingsOpen(!isSettingsOpen)}
        />
        <main className="container mx-auto p-4">
          {isSettingsOpen ? (
            <SettingsTab />
          ) : (
            <Tabs.Root
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as TabType)}
            >
              <Tabs.List className="flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground w-full">
                <Tabs.Trigger
                  value="pdf-csv"
                  className="flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                >
                  {t('tab.pdf-csv')}
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="audio"
                  className="flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                >
                  {t('tab.audio')}
                </Tabs.Trigger>
              </Tabs.List>
              <div className="mt-6">
                <Tabs.Content value="pdf-csv" className="focus-visible:outline-none">
                  <PdfCsvTab />
                </Tabs.Content>
                <Tabs.Content value="audio" className="focus-visible:outline-none">
                  <AudioTab />
                </Tabs.Content>
              </div>
            </Tabs.Root>
          )}
        </main>
      </div>
    </div>
  );
};

export default App; 