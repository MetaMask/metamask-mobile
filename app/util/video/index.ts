import _ from 'lodash';
import videoSourceUri from '../../videos/recovery-phrase-mobile-2pass-optimized.mp4';

// Remote path for subtitles that can't be bundled with the app
// because only remote subtitles are supported by react-native-video
const baseRemoteSubtitlesPath =
  'https://github.com/MetaMask/metamask-mobile/blob/main/app/';
const baseSubtitlesPath = 'videos/subtitles/secretPhrase/';
const subtitleFileFormat = 'subtitles-${language}.vtt';
const gitHubRawPathParam = '?raw=true';
const subtitlePathTemplate = `${baseRemoteSubtitlesPath}${baseSubtitlesPath}${subtitleFileFormat}${gitHubRawPathParam}`;

/**
 * Returns the subtitle URI for a given language
 * @param language
 */
export function getSubtitleUri(language: string): string {
  return _.template(subtitlePathTemplate)({ language });
}

// Bundled recovery phrase video local path
export const video_source_uri = videoSourceUri;
