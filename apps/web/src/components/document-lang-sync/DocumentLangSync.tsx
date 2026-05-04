import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/** Keeps `<html lang>`, `dir`, and document title in sync with the active locale (RTL for Hebrew). */
export function DocumentLangSync() {
  const { i18n, t } = useTranslation();

  useEffect(() => {
    const lng = i18n.language;
    document.documentElement.lang = lng;
    document.documentElement.dir = lng.startsWith('he') ? 'rtl' : 'ltr';
    document.title = t('common.appTitle');
  }, [i18n.language, t]);

  return null;
}
