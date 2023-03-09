const baseUrl =
  'https://github.com/MetaMask/metamask-mobile/blob/main/app/videos/';
const subtitlePath = 'subtitles/secretPhrase/subtitles-';
const ext = '.vtt?raw=true';
const path = `${baseUrl}${subtitlePath}`;

export function getSubtitleUri(language: string): string {
  return `${path}${language}${ext}`;
}

export const video_source_uri = `${baseUrl}recovery-phrase.mp4?raw=true`;
