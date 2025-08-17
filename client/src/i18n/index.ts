import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import translationEN from './locales/en/translation.json';
import translationFR from './locales/fr/translation.json';
import pwaEN from './locales/en/pwa.json';
import pwaFR from './locales/fr/pwa.json';

// The translations
const resources = {
  en: {
    translation: { ...translationEN, ...pwaEN }
  },
  fr: {
    translation: { ...translationFR, ...pwaFR }
  }
};

i18n
  // detect user language
  .use(LanguageDetector)
  // pass the i18n instance to react-i18next
  .use(initReactI18next)
  // init i18next
  .init({
    resources,
    fallbackLng: 'fr', // Default language is French
    debug: false, // Disable debug mode - translations now working
    interpolation: {
      escapeValue: false, // React already safes from XSS
    },
    returnObjects: true, // Enable accessing nested objects
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    react: {
      useSuspense: false, // Disable suspense to prevent loading issues
    }
  });

export default i18n;