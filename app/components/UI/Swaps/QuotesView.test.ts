import BigNumber from 'bignumber.js';
import {
  gasLimitWithMultiplier,
  isCorrectDestinationAmount,
} from './QuotesView';

describe('QuotesView', () => {
  describe('gasLimitWithMultiplier', () => {
    it('multiplies gas limit by multiplier', () => {
      const res = gasLimitWithMultiplier('123', 2);
      expect(res).toEqual(new BigNumber('246'));
    });
    it('returns undefined if gas limit undefined', () => {
      // @ts-expect-error Testing undefined case, which could happen in JS file
      const res = gasLimitWithMultiplier(undefined, 2);
      expect(res).toEqual(undefined);
    });
    it('returns undefined if multiplier undefined', () => {
      // @ts-expect-error Testing undefined case, which could happen in JS file
      const res = gasLimitWithMultiplier('123', undefined);
      expect(res).toEqual(undefined);
    });
    it('returns undefined if result is NaN', () => {
      const res = gasLimitWithMultiplier('asd', 2);
      expect(res).toEqual(undefined);
    });
    it('returns undefined if error is thrown', () => {
      jest.spyOn(BigNumber.prototype, 'times').mockImplementation(() => {
        throw new Error('Test error');
      });
      const res = gasLimitWithMultiplier('asd', 2);
      expect(res).toEqual(undefined);

      // @ts-expect-error We mocked this earlier, so restore it
      BigNumber.prototype.times.mockRestore();
    });
  });
  describe('isCorrectDestinationAmount', () => {
    it('should return true for valid destinationAmount', () => {
      const quote = { destinationAmount: '100' };
      expect(isCorrectDestinationAmount(quote)).toBe(true);
    });

    it('should return false for invalid destinationAmount', () => {
      const quote = { destinationAmount: 'abc' };
      expect(isCorrectDestinationAmount(quote)).toBe(false);
    });

    it('should return false when destinationAmount is not provided', () => {
      const quote = {};
      expect(isCorrectDestinationAmount(quote)).toBe(false);
    });
  });
});
