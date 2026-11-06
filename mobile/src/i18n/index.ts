import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import fr from './fr';
import en from './en';

export const LANGUAGES = ['fr', 'en'] as const;
export type Lang = (typeof LANGUAGES)[number];

const device = getLocales()[0]?.languageCode;
const initial: Lang = device === 'en' ? 'en' : 'fr'; // French by default in Tunisia

i18n.use(initReactI18next).init({
  resources: { fr: { translation: fr }, en: { translation: en } },
  lng: initial,
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
});

export default i18n;
