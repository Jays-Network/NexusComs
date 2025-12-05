import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AppSettings {
  hapticFeedback: boolean;
  soundEffects: boolean;
  messagePreview: boolean;
  autoDownloadMedia: boolean;
  saveToGallery: boolean;
  readReceipts: boolean;
  typingIndicators: boolean;
}

interface SettingsContextType {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  resetSettings: () => void;
}

const defaultSettings: AppSettings = {
  hapticFeedback: true,
  soundEffects: true,
  messagePreview: true,
  autoDownloadMedia: true,
  saveToGallery: false,
  readReceipts: true,
  typingIndicators: true,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const SETTINGS_STORAGE_KEY = '@app_settings';

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      }
    } catch (error) {
      console.error('[SettingsContext] Failed to load settings:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveSettings = async (newSettings: AppSettings) => {
    try {
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.error('[SettingsContext] Failed to save settings:', error);
    }
  };

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      saveSettings(newSettings);
      return newSettings;
    });
  };

  const resetSettings = async () => {
    setSettings(defaultSettings);
    await saveSettings(defaultSettings);
  };

  if (!isLoaded) {
    return null;
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useAppSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useAppSettings must be used within SettingsProvider');
  }
  return context;
}
