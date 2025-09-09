import { Button } from "@/components/ui/button";
import { i18n, type Language } from "@/lib/i18n";
import { storage } from "@/lib/storage";
import { useState, useEffect } from "react";
import { Globe } from "lucide-react";

export function LanguageToggle() {
  const [language, setLanguage] = useState<Language>(i18n.getLanguage());

  useEffect(() => {
    const savedLang = storage.getLanguage();
    setLanguage(savedLang);
    i18n.setLanguage(savedLang);
  }, []);

  const toggleLanguage = () => {
    const newLang: Language = language === 'en' ? 'es' : 'en';
    setLanguage(newLang);
    i18n.setLanguage(newLang);
    storage.setLanguage(newLang);
    
    // Force a re-render by dispatching a custom event
    window.dispatchEvent(new CustomEvent('languageChanged'));
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className="flex items-center gap-2"
    >
      <Globe className="h-4 w-4" />
      {language.toUpperCase()}
    </Button>
  );
}