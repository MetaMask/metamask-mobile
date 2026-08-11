import { getTrimmedSeedPhraseWords, isSRPLengthValid } from './srpInputUtils';

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
});
