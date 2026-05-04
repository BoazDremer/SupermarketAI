import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import he from './locales/he';

export const LOCALE_STORAGE_KEY = 'spc_locale';

function initialLanguage(): string {
  if (typeof window === 'undefined') return 'en';
  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored === 'he' || stored === 'en') return stored;
  const nav = window.navigator.language?.toLowerCase() ?? '';
  if (nav.startsWith('he')) return 'he';
  return 'en';
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    he: { translation: he },
  },
  lng: initialLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (lng) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, lng);
  }
});

export default i18n;
