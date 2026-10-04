import {
  appendKlipyGifUrlToCommentText,
  isKlipyStaticGifUrl,
  KLIPY_STATIC_GIF_EXAMPLE,
  splitKlipyGifFromCommentText,
} from './klipyGifComment';

describe('klipyGifComment', () => {
  describe('isKlipyStaticGifUrl', () => {
    it('accepts a static.klipy.com gif file url', () => {
      expect(isKlipyStaticGifUrl(KLIPY_STATIC_GIF_EXAMPLE)).toBe(true);
    });

    it('rejects a klipy.com gif page url', () => {
      expect(isKlipyStaticGifUrl('https://klipy.com/gifs/aaaa-anger')).toBe(
        false,
      );
    });

    it('rejects a non-klipy gif url', () => {
      expect(isKlipyStaticGifUrl('https://media.test/picked.gif')).toBe(false);
    });
  });

  describe('appendKlipyGifUrlToCommentText', () => {
    it('appends the gif url on its own line after the caption', () => {
      const result = appendKlipyGifUrlToCommentText(
        'Loading up here',
        KLIPY_STATIC_GIF_EXAMPLE,
      );

      expect(result).toBe(`Loading up here\n${KLIPY_STATIC_GIF_EXAMPLE}`);
    });

    it('returns only the gif url when the caption is empty', () => {
      const result = appendKlipyGifUrlToCommentText(
        '',
        KLIPY_STATIC_GIF_EXAMPLE,
      );

      expect(result).toBe(KLIPY_STATIC_GIF_EXAMPLE);
    });

    it('leaves the caption unchanged when the gif url is not a klipy file', () => {
      const result = appendKlipyGifUrlToCommentText(
        'Loading up here',
        'https://media.test/picked.gif',
      );

      expect(result).toBe('Loading up here');
    });
  });

  describe('splitKlipyGifFromCommentText', () => {
    it('strips a trailing klipy gif url from the caption', () => {
      const result = splitKlipyGifFromCommentText(
        `Loading up here\n${KLIPY_STATIC_GIF_EXAMPLE}`,
      );

      expect(result).toStrictEqual({
        text: 'Loading up here',
        gifUrl: KLIPY_STATIC_GIF_EXAMPLE,
      });
    });

    it('returns gif-only comment text as an empty caption', () => {
      const result = splitKlipyGifFromCommentText(KLIPY_STATIC_GIF_EXAMPLE);

      expect(result).toStrictEqual({
        text: '',
        gifUrl: KLIPY_STATIC_GIF_EXAMPLE,
      });
    });

    it('leaves comment text unchanged when there is no klipy gif url', () => {
      const result = splitKlipyGifFromCommentText('Loading up here');

      expect(result).toStrictEqual({ text: 'Loading up here' });
    });
  });
});
