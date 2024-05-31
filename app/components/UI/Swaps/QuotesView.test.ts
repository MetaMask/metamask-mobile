import BigNumber from 'bignumber.js';
import {
  getGasLimitWithMultiplier,
  isValidDestinationAmount,
} from './QuotesView';

describe('QuotesView', () => {
  describe('getGasLimitWithMultiplier', () => {
    it('multiplies gas limit by multiplier', () => {
      const res = getGasLimitWithMultiplier('123', 2);
      expect(res).toEqual(new BigNumber('246'));
    });

    it.each([
      { gasLimit: undefined, multiplier: 2 },
      { gasLimit: null, multiplier: 2 },
      { gasLimit: 'asd', multiplier: 2 },
      { gasLimit: NaN, multiplier: 2 },
      { gasLimit: {}, multiplier: 2 },
      { gasLimit: [], multiplier: 2 },

      { gasLimit: '123', multiplier: undefined },
      { gasLimit: '123', multiplier: null },
      { gasLimit: '123', multiplier: 'asd' },
      { gasLimit: '123', multiplier: NaN },
      { gasLimit: '123', multiplier: {} },
      { gasLimit: '123', multiplier: [] },

      { gasLimit: undefined, multiplier: undefined },
      { gasLimit: NaN, multiplier: NaN },
    ])(
      'returns undefined for invalid gasLimit $gasLimit and multiplier $multiplier',
      ({ gasLimit, multiplier }) => {
        // @ts-expect-error Testing undefined case, which could happen in JS file
        expect(getGasLimitWithMultiplier(gasLimit, multiplier)).toBe(undefined);
      },
    );

    it('returns undefined if error is thrown', () => {
      jest.spyOn(BigNumber.prototype, 'times').mockImplementation(() => {
        throw new Error('Test error');
      });
      const res = getGasLimitWithMultiplier('asd', 2);
      expect(res).toEqual(undefined);

      // @ts-expect-error We mocked this earlier, so restore it
      BigNumber.prototype.times.mockRestore();
    });
  });
  describe('isValidDestinationAmount', () => {
    it('returns true for valid destinationAmount', () => {
      const quote = { destinationAmount: '100' };
      expect(isValidDestinationAmount(quote)).toBe(true);
    });

    it.each([
      { destinationAmount: 'abc' },
      { destinationAmount: {} },
      { destinationAmount: [] },
      { destinationAmount: NaN },
      { destinationAmount: 'NaN' },
    ])(
      'returns false when destinationAmount is $destinationAmount',
      ({ destinationAmount }) => {
        const quote = { destinationAmount };
        expect(isValidDestinationAmount(quote)).toBe(false);
      },
    );

    it('return false when destinationAmount is not provided', () => {
      const quote = {};
      expect(isValidDestinationAmount(quote)).toBe(false);
    });
  });
});
