import { getSubtitleUri, video_source_uri } from '.';
import { getLanguages } from '../../../locales/i18n';

/**
 * This test ensures that the assets paths is correct for each language
 * see /app/videos/README.md for more info
 */
describe('getSubtitleUri', () => {
  const languageKeys = Object.keys(getLanguages());
  languageKeys.forEach((key) => {
    it(`should return correct path for '${key}' lang`, () => {
      expect(getSubtitleUri(key)).toStrictEqual(
        `https://metamask.github.io/metamask-mobile/Subtitles/v1/secretPhrase/subtitles-${key}.vtt`,
      );
    });
  });
});

/**
 * This test ensures that the video asset is available for bundling
 * see /app/videos/README.md for more info
 */
describe('getVideoUri', () => {
  it('should return asset path', () => {
    // check if the path is well transformed into a testUri meaning the resource was found
    expect(video_source_uri).toEqual({
      testUri: '../../../app/videos/recovery-phrase.mp4',
    });
  });
});
