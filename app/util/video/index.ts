const baseUrl =
  'https://github.com/MetaMask/metamask-mobile/blob/main/app/videos/';
const subtitlePath = 'subtitles/secretPhrase/subtitles-';
const ext = '.vtt?raw=true';
const path = `${baseUrl}${subtitlePath}`;

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

export function getSubtitleUri(language: string): string {
  if (Object.prototype.hasOwnProperty.call(subtitleMap, language)) {
    return `${path}${subtitleMap[language]}${ext}`;
  }
  // return english by default
  return `${path}en${ext}`;
}

export const video_source_uri = `${baseUrl}recovery-phrase.mp4?raw=true`;
