import { formatUTCDateFromUnixTimestamp } from './date';

describe('date util', () => {
  describe('formatUTCDateFromUnixTimestamp', () => {
    it('formats passed date string', () => {
      expect(formatUTCDateFromUnixTimestamp(2036528542)).toStrictEqual(
        '14 July 2034, 22:22',
      );
    });

    it('returns empty string if no value is passed', () => {
      expect(
        formatUTCDateFromUnixTimestamp(undefined as unknown as number),
      ).toStrictEqual(undefined);
    });
  });
});
