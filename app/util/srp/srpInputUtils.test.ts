import {
  capSrpWordCount,
  getTrimmedSeedPhraseWords,
  isSRPLengthValid,
  MAX_SRP_LENGTH,
} from './srpInputUtils';

describe('srpInputUtils', () => {
  describe('getTrimmedSeedPhraseWords', () => {
    it('drops trailing empty slots from the SRP grid', () => {
      const words = [
        'frame',
        'midnight',
        'talk',
        'absent',
        'spy',
        'release',
        'check',
        'below',
        'volume',
        'industry',
        'advance',
        'neglect',
        '',
      ];

      expect(getTrimmedSeedPhraseWords(words)).toHaveLength(12);
      expect(isSRPLengthValid(words)).toBe(true);
    });
  });

  describe('capSrpWordCount', () => {
    it('keeps phrases at or below the maximum SRP length', () => {
      const twelveWords = Array.from({ length: 12 }, (_, i) => `word${i}`);

      expect(capSrpWordCount(twelveWords)).toEqual(twelveWords);
    });

    it('drops words beyond the maximum SRP length', () => {
      const extraWords = Array.from(
        { length: MAX_SRP_LENGTH + 3 },
        (_, i) => `word${i}`,
      );

      const capped = capSrpWordCount(extraWords);

      expect(capped).toHaveLength(MAX_SRP_LENGTH);
      expect(capped).toEqual(extraWords.slice(0, MAX_SRP_LENGTH));
    });
  });
});
