import { getSubtitleUri } from '.';
import { getLanguages } from '../../../locales/i18n';

describe('getSubtitleUri', () => {
  const languageKeys = Object.keys(getLanguages());
  languageKeys.forEach((key) => {
    it(`should return ${key} for ${key}`, () => {
      expect(getSubtitleUri(key)).toStrictEqual(
        `https://github.com/MetaMask/metamask-mobile/blob/main/app/videos/subtitles/secretPhrase/subtitles-${key}.vtt?raw=true`,
      );
    });
  });
});
