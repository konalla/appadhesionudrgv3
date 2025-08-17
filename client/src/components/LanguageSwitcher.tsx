import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

const languages = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' }
];

export default function LanguageSwitcher({ showLabel = false }: { showLabel?: boolean }) {
  const { i18n, t } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);

  useEffect(() => {
    setCurrentLanguage(i18n.language);
  }, [i18n.language]);

  const changeLanguage = (lng: string) => {
    // Save language preference to localStorage
    localStorage.setItem('i18nextLng', lng);
    
    i18n.changeLanguage(lng);
    setCurrentLanguage(lng);
    
    // Force page reload to apply translations everywhere
    window.location.reload();
  };

  return (
    <div className="flex items-center gap-1">
      {showLabel && (
        <span className="text-sm font-medium mr-1 text-white">
          <Globe className="h-4 w-4 inline-block mr-1" />
          {t('common.language')}:
        </span>
      )}
      
      <div className="flex items-center bg-white/10 rounded overflow-hidden h-8">
        {languages.map((lang) => (
          <Button
            key={lang.code}
            variant="ghost"
            size="sm"
            className={`
              px-1.5 py-0 text-xs rounded-none font-medium h-full
              ${currentLanguage === lang.code 
                ? "bg-blue-700 text-white hover:bg-blue-800" 
                : "bg-transparent text-white hover:bg-white/20"}
              ${lang.code === 'fr' ? 'border-r border-white/20' : ''}
            `}
            onClick={() => changeLanguage(lang.code)}
          >
            {lang.code === 'fr' ? 'FR' : 'EN'}
          </Button>
        ))}
      </div>
    </div>
  );
}