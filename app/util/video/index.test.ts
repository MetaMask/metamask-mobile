import { getSubtitleUri, video_source_uri } from '.';
import { getLanguages } from '../../../locales/i18n';

describe('getSubtitleUri', () => {
  const subtitlesPathBase =
    'https://github.com/MetaMask/metamask-mobile/blob/main/app/';
  const languageKeys = Object.keys(getLanguages());
  languageKeys.forEach((key) => {
    it(`should return correct path for '${key}' lang`, () => {
      expect(getSubtitleUri(key)).toStrictEqual(
        `${subtitlesPathBase}videos/subtitles/secretPhrase/subtitles-${key}.vtt?raw=true`,
      );
    });
  });
});

describe('getVideoUri', () => {
  it('should return asset path', () => {
    // check if the path is well transformed into a testUri meaning the resource was found
    expect(video_source_uri).toEqual({
      testUri: '../../../app/videos/recovery-phrase.mp4',
    });
  });
});
