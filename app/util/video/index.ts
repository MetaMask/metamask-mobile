export const baseUrl =
  'https://github.com/MetaMask/metamask-mobile/blob/main/app/videos/';
export const subtitlePath = 'subtitles/secretPhrase/subtitles-';

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
  const path = `${baseUrl}${subtitlePath}`;
  const ext = '.vtt?raw=true';
  // eslint-disable-next-line no-prototype-builtins
  if (subtitleMap.hasOwnProperty(language)) {
    return `${path}${subtitleMap[language]}${ext}`;
  }
  // return english by default
  return `${path}en${ext}`;
}

export const video_source_uri = `${baseUrl}recovery-phrase.mp4?raw=true`;
