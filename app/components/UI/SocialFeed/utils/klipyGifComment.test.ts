import {
  appendKlipyGifUrlToCommentText,
  isKlipyStaticGifUrl,
  KLIPY_STATIC_GIF_EXAMPLE,
  splitKlipyGifFromCommentText,
  stripKlipyGifUrls,
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

    it('removes the last occurrence when identical klipy urls appear twice', () => {
      const result = splitKlipyGifFromCommentText(
        `Loading up here ${KLIPY_STATIC_GIF_EXAMPLE} more text\n${KLIPY_STATIC_GIF_EXAMPLE}`,
      );

      expect(result).toStrictEqual({
        text: `Loading up here ${KLIPY_STATIC_GIF_EXAMPLE} more text`,
        gifUrl: KLIPY_STATIC_GIF_EXAMPLE,
      });
    });

    it('handles repeated klipy prefixes in linear time', () => {
      const repeated = 'https://static.klipy.com/'.repeat(12_000);
      const started = performance.now();

      expect(splitKlipyGifFromCommentText(repeated)).toStrictEqual({
        text: repeated,
      });
      expect(
        splitKlipyGifFromCommentText(
          `${repeated}\n${KLIPY_STATIC_GIF_EXAMPLE}`,
        ),
      ).toStrictEqual({
        text: repeated,
        gifUrl: KLIPY_STATIC_GIF_EXAMPLE,
      });
      expect(performance.now() - started).toBeLessThan(500);
    });
  });

  describe('stripKlipyGifUrls', () => {
    it('removes all klipy gif urls from multi-line text', () => {
      const result = stripKlipyGifUrls(
        `First line\nSecond line\n${KLIPY_STATIC_GIF_EXAMPLE}\n${KLIPY_STATIC_GIF_EXAMPLE}`,
      );

      expect(result).toBe('First line\nSecond line');
    });

    it('returns an empty string when text only contains klipy gif urls', () => {
      const result = stripKlipyGifUrls(
        `${KLIPY_STATIC_GIF_EXAMPLE}\n${KLIPY_STATIC_GIF_EXAMPLE}`,
      );

      expect(result).toBe('');
    });

    it('strips a klipy gif url followed immediately by a sentence period', () => {
      const result = stripKlipyGifUrls(
        `Translated line\n${KLIPY_STATIC_GIF_EXAMPLE}.`,
      );

      expect(result).toBe('Translated line.');
    });

    it('leaves non-gif extensions after .gif untouched', () => {
      const nonGif = `${KLIPY_STATIC_GIF_EXAMPLE}.png`;

      expect(stripKlipyGifUrls(`Check ${nonGif}`)).toBe(`Check ${nonGif}`);
    });

    it('returns an empty string for null or undefined input', () => {
      expect(stripKlipyGifUrls(null)).toBe('');
      expect(stripKlipyGifUrls(undefined)).toBe('');
    });
  });
});
