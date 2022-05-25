import I18n from '../../../locales/i18n';
import { TextTrackType } from 'react-native-video';

export const baseUrl =
  'https://github.com/MetaMask/metamask-mobile/blob/main/app/videos/';

const language = I18n.locale.substr(0, 2);
const subtitlePath = 'subtitles/secretPhrase/subtitles-';

const subtitleMap: Record<string, string> = {
  es: 'es',
  hi: 'hi-in',
  id: 'id-id',
  ja: 'ja-jp',
  ko: 'ko-kr',
  pt: 'pt-br',
  ru: 'ru-ru',
  tl: 'tl',
  vi: 'vi-vn',
};

export function getSubtitleUri(lang: string): string {
  const path = `${baseUrl}${subtitlePath}`;
  const ext = '.vtt?raw=true';
  // eslint-disable-next-line no-prototype-builtins
  if (subtitleMap.hasOwnProperty(lang)) {
    return `${path}${subtitleMap[lang]}${ext}`;
  }
  // return english by default
  return `${path}en${ext}`;
}

export const subtitle_source_tracks = [
  {
    index: 0,
    title: `${String(language).toUpperCase()} CC`,
    language: `${language}`,
    type: TextTrackType.VTT,
    uri: getSubtitleUri(language),
  },
];

export const video_source_uri = `${baseUrl}recovery-phrase.mp4?raw=true`;
