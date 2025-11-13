import { useState, useEffect } from 'react';
import { i18n } from '@/lib/i18n';

export function useTranslation() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const handleLanguageChange = () => {
      forceUpdate(prev => prev + 1);
    };

    window.addEventListener('languageChanged', handleLanguageChange);
    return () => window.removeEventListener('languageChanged', handleLanguageChange);
  }, []);

  const t = (key: string, params?: Record<string, string | number>): string => {
    return i18n.t(key, params);
  };

  return { t, language: i18n.getLanguage() };
}
