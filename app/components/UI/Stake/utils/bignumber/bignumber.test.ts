import BigNumber from 'bignumber.js';
import { getPowerOfTen, multiplyValueByPowerOfTen } from './index';

describe('bignumber utils', () => {
  describe('getPowerOfTen', () => {
    it('handles a number of inputs and returns a BigNumber', () => {
      expect(getPowerOfTen(0)).toEqual(new BigNumber(1));
      expect(getPowerOfTen(1)).toEqual(new BigNumber(10));
      expect(getPowerOfTen(2)).toEqual(new BigNumber(100));
      expect(getPowerOfTen(3)).toEqual(new BigNumber(1000));
      expect(getPowerOfTen(-1)).toEqual(new BigNumber(0.1));
      expect(getPowerOfTen(-2)).toEqual(new BigNumber(0.01));
      expect(getPowerOfTen(-3)).toEqual(new BigNumber(0.001));
      expect(getPowerOfTen(Number.POSITIVE_INFINITY)).toEqual(
        new BigNumber('Infinity'),
      );
      expect(getPowerOfTen(Number.NEGATIVE_INFINITY)).toEqual(new BigNumber(0));
    });
  });
  describe('multiplyValueByPowerOfTen', () => {
    it('multiplies small numbers by the power of ten provided and returns a BigNumber', () => {
      const input = 0.000004577280038473;
      expect(multiplyValueByPowerOfTen(input, 0)).toEqual(new BigNumber(input));
      expect(multiplyValueByPowerOfTen(input, 1)).toEqual(
        new BigNumber(0.00004577280038473),
      );
      expect(multiplyValueByPowerOfTen(input, 2)).toEqual(
        new BigNumber(0.0004577280038473),
      );
      expect(multiplyValueByPowerOfTen(input, 3)).toEqual(
        new BigNumber(0.004577280038473),
      );
      expect(multiplyValueByPowerOfTen(input, 10)).toEqual(
        new BigNumber(45772.80038473),
      );
      expect(multiplyValueByPowerOfTen(input, 30)).toEqual(
        new BigNumber('4577280038473000000000000'),
      );
      expect(
        multiplyValueByPowerOfTen(input, Number.POSITIVE_INFINITY),
      ).toEqual(new BigNumber('Infinity'));
      expect(multiplyValueByPowerOfTen(input, -1)).toEqual(
        new BigNumber(0.0000004577280038473),
      );
      expect(multiplyValueByPowerOfTen(input, -10)).toEqual(
        new BigNumber(0.0000000000000004577280038473),
      );
      expect(
        multiplyValueByPowerOfTen(input, Number.NEGATIVE_INFINITY),
      ).toEqual(new BigNumber(0));
    });
    it('multiplies large numbers by the power of ten provided', () => {
      // disabling no-loss-of-precision because excessively precise inputs are possible
      // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
      const input = 393859854789998.4883;
      expect(multiplyValueByPowerOfTen(input, 0)).toEqual(new BigNumber(input));

      expect(multiplyValueByPowerOfTen(input, 1)).toEqual(
        // disabling no-loss-of-precision because excessively precise inputs are possible
        // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
        new BigNumber(3938598547899984.883),
      );

      expect(multiplyValueByPowerOfTen(input, 2)).toEqual(
        // disabling no-loss-of-precision because excessively precise inputs are possible
        // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
        new BigNumber(39385985478999848.83),
      );

      expect(multiplyValueByPowerOfTen(input, 10)).toEqual(
        new BigNumber('3.938598547899985e+24'),
      );
      expect(multiplyValueByPowerOfTen(input, 30)).toEqual(
        new BigNumber('3.938598547899985e+44'),
      );
      expect(
        multiplyValueByPowerOfTen(input, Number.POSITIVE_INFINITY),
      ).toEqual(new BigNumber(Infinity));
      expect(multiplyValueByPowerOfTen(input, -1)).toEqual(
        new BigNumber('39385985478999.85'),
      );
      expect(multiplyValueByPowerOfTen(input, -10)).toEqual(
        new BigNumber('39385.98547899985'),
      );
      expect(
        multiplyValueByPowerOfTen(input, Number.NEGATIVE_INFINITY),
      ).toEqual(new BigNumber(0));
    });
    it('multiplies zero to the power of ten provided and returns a BigNumber', () => {
      expect(multiplyValueByPowerOfTen(0, 10)).toEqual(new BigNumber(0));
      expect(multiplyValueByPowerOfTen(0, 0)).toEqual(new BigNumber(0));
      expect(multiplyValueByPowerOfTen(0, -10)).toEqual(new BigNumber(0));
      expect(multiplyValueByPowerOfTen(0, Number.POSITIVE_INFINITY)).toEqual(
        new BigNumber(0),
      );
      expect(multiplyValueByPowerOfTen(0, Number.NEGATIVE_INFINITY)).toEqual(
        new BigNumber(0),
      );
    });
    it('multiplies infinity to the power of ten provided and returns a BigNumber', () => {
      const input = Number.POSITIVE_INFINITY;
      expect(multiplyValueByPowerOfTen(input, 10)).toEqual(
        new BigNumber('Infinity'),
      );
      expect(multiplyValueByPowerOfTen(input, 0)).toEqual(
        new BigNumber('Infinity'),
      );
      expect(multiplyValueByPowerOfTen(input, -10)).toEqual(
        new BigNumber('Infinity'),
      );
      expect(
        multiplyValueByPowerOfTen(input, Number.POSITIVE_INFINITY),
      ).toEqual(new BigNumber(Number.POSITIVE_INFINITY));
      expect(
        multiplyValueByPowerOfTen(input, Number.NEGATIVE_INFINITY),
      ).toEqual(new BigNumber(0));
    });
    it('multiplies negative infinity to the power of ten provided and returns a BigNumber', () => {
      const input = Number.NEGATIVE_INFINITY;
      expect(multiplyValueByPowerOfTen(input, 10)).toEqual(
        new BigNumber(Number.NEGATIVE_INFINITY),
      );
      expect(multiplyValueByPowerOfTen(input, 0)).toEqual(
        new BigNumber(Number.NEGATIVE_INFINITY),
      );
      expect(multiplyValueByPowerOfTen(input, -10)).toEqual(
        new BigNumber(Number.NEGATIVE_INFINITY),
      );
      expect(
        multiplyValueByPowerOfTen(input, Number.POSITIVE_INFINITY),
      ).toEqual(new BigNumber(Number.NEGATIVE_INFINITY));
      expect(
        multiplyValueByPowerOfTen(input, Number.NEGATIVE_INFINITY),
      ).toEqual(new BigNumber(0));
    });
  });
});
