import BigNumber from 'bignumber.js';
import { BigNumber as BN } from 'ethers';
import {
  getPowerOfTen,
  multiplyValueByPowerOfTen,
  BigNumberUtilsReturnFormat,
  getBigNumberFromBN,
  getPowerOfTenFormatted,
  multiplyValueByPowerOfTenFormatted,
} from './index';

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
  describe('getPowerOfTenFormatted', () => {
    it('handles a number of inputs in the BigNumber return format', () => {
      expect(getPowerOfTenFormatted(0)).toEqual(new BigNumber(1));
      expect(getPowerOfTenFormatted(1)).toEqual(new BigNumber(10));
      expect(getPowerOfTenFormatted(2)).toEqual(new BigNumber(100));
      expect(getPowerOfTenFormatted(3)).toEqual(new BigNumber(1000));
      expect(getPowerOfTenFormatted(-1)).toEqual(new BigNumber(0.1));
      expect(getPowerOfTenFormatted(-2)).toEqual(new BigNumber(0.01));
      expect(getPowerOfTenFormatted(-3)).toEqual(new BigNumber(0.001));
      expect(getPowerOfTenFormatted(Number.POSITIVE_INFINITY)).toEqual(
        new BigNumber('Infinity'),
      );
      expect(getPowerOfTenFormatted(Number.NEGATIVE_INFINITY)).toEqual(
        new BigNumber(0),
      );
    });
    it('handles a number of inputs in the number return format', () => {
      expect(
        getPowerOfTenFormatted(0, BigNumberUtilsReturnFormat.NUMBER),
      ).toEqual(1);
      expect(
        getPowerOfTenFormatted(1, BigNumberUtilsReturnFormat.NUMBER),
      ).toEqual(10);
      expect(
        getPowerOfTenFormatted(2, BigNumberUtilsReturnFormat.NUMBER),
      ).toEqual(100);
      expect(
        getPowerOfTenFormatted(3, BigNumberUtilsReturnFormat.NUMBER),
      ).toEqual(1000);
      expect(
        getPowerOfTenFormatted(-1, BigNumberUtilsReturnFormat.NUMBER),
      ).toEqual(0.1);
      expect(
        getPowerOfTenFormatted(-2, BigNumberUtilsReturnFormat.NUMBER),
      ).toEqual(0.01);
      expect(
        getPowerOfTenFormatted(-3, BigNumberUtilsReturnFormat.NUMBER),
      ).toEqual(0.001);
      expect(
        getPowerOfTenFormatted(
          Number.POSITIVE_INFINITY,
          BigNumberUtilsReturnFormat.NUMBER,
        ),
      ).toEqual(Number.POSITIVE_INFINITY);
      expect(
        getPowerOfTenFormatted(
          Number.NEGATIVE_INFINITY,
          BigNumberUtilsReturnFormat.NUMBER,
        ),
      ).toEqual(0);
    });
    it('handles a number of inputs in the string return format', () => {
      expect(
        getPowerOfTenFormatted(0, BigNumberUtilsReturnFormat.STRING),
      ).toEqual('1');
      expect(
        getPowerOfTenFormatted(1, BigNumberUtilsReturnFormat.STRING),
      ).toEqual('10');
      expect(
        getPowerOfTenFormatted(2, BigNumberUtilsReturnFormat.STRING),
      ).toEqual('100');
      expect(
        getPowerOfTenFormatted(3, BigNumberUtilsReturnFormat.STRING),
      ).toEqual('1000');
      expect(
        getPowerOfTenFormatted(-1, BigNumberUtilsReturnFormat.STRING),
      ).toEqual('0.1');
      expect(
        getPowerOfTenFormatted(-2, BigNumberUtilsReturnFormat.STRING),
      ).toEqual('0.01');
      expect(
        getPowerOfTenFormatted(-3, BigNumberUtilsReturnFormat.STRING),
      ).toEqual('0.001');
      expect(
        getPowerOfTenFormatted(
          Number.POSITIVE_INFINITY,
          BigNumberUtilsReturnFormat.STRING,
        ),
      ).toEqual('Infinity');
      expect(
        getPowerOfTenFormatted(
          Number.NEGATIVE_INFINITY,
          BigNumberUtilsReturnFormat.STRING,
        ),
      ).toEqual('0');
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
  describe('multiplyValueByPowerOfTenFormatted', () => {
    it('multiplies small numbers by the power of ten provided and returns them as numbers', () => {
      const input = 0.000004577280038473;
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          0,
          BigNumberUtilsReturnFormat.NUMBER,
        ),
      ).toEqual(input);
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          1,
          BigNumberUtilsReturnFormat.NUMBER,
        ),
      ).toEqual(0.00004577280038473);
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          2,
          BigNumberUtilsReturnFormat.NUMBER,
        ),
      ).toEqual(0.0004577280038473);
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          10,
          BigNumberUtilsReturnFormat.NUMBER,
        ),
      ).toEqual(45772.80038473);
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          30,
          BigNumberUtilsReturnFormat.NUMBER,
        ),
      ).toEqual(4577280038473000000000000);
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          Number.POSITIVE_INFINITY,
          BigNumberUtilsReturnFormat.NUMBER,
        ),
      ).toEqual(Number.POSITIVE_INFINITY);
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          -1,
          BigNumberUtilsReturnFormat.NUMBER,
        ),
      ).toEqual(0.0000004577280038473);
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          -10,
          BigNumberUtilsReturnFormat.NUMBER,
        ),
      ).toEqual(0.0000000000000004577280038473);
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          Number.NEGATIVE_INFINITY,
          BigNumberUtilsReturnFormat.NUMBER,
        ),
      ).toEqual(0);
    });
    it('multiplies small numbers by the power of ten provided and returns them as strings', () => {
      const input = 0.000004577280038473;
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          0,
          BigNumberUtilsReturnFormat.STRING,
        ),
      ).toEqual('0.000004577280038473');
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          1,
          BigNumberUtilsReturnFormat.STRING,
        ),
      ).toEqual('0.00004577280038473');
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          2,
          BigNumberUtilsReturnFormat.STRING,
        ),
      ).toEqual('0.0004577280038473');
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          10,
          BigNumberUtilsReturnFormat.STRING,
        ),
      ).toEqual('45772.80038473');
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          30,
          BigNumberUtilsReturnFormat.STRING,
        ),
      ).toEqual('4.577280038473e+24');
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          Number.POSITIVE_INFINITY,
          BigNumberUtilsReturnFormat.STRING,
        ),
      ).toEqual(Number.POSITIVE_INFINITY.toString());
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          -1,
          BigNumberUtilsReturnFormat.STRING,
        ),
      ).toEqual('4.577280038473e-7');
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          -10,
          BigNumberUtilsReturnFormat.STRING,
        ),
      ).toEqual('4.577280038473e-16');
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          Number.NEGATIVE_INFINITY,
          BigNumberUtilsReturnFormat.STRING,
        ),
      ).toEqual('0');
    });
    it('multiplies large numbers by the power of ten provided and returns them as numbers', () => {
      // disabling no-loss-of-precision because excessively precise inputs are possible
      // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
      const input = 393859854789998.4883;
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          0,
          BigNumberUtilsReturnFormat.NUMBER,
        ),
      ).toEqual(input);

      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          1,
          BigNumberUtilsReturnFormat.NUMBER,
        ),
      ).toEqual(
        // disabling no-loss-of-precision because excessively precise inputs are possible
        // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
        3938598547899984.883,
      );

      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          2,
          BigNumberUtilsReturnFormat.NUMBER,
        ),
      ).toEqual(
        // disabling no-loss-of-precision because excessively precise inputs are possible
        // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
        39385985478999848.83,
      );

      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          10,
          BigNumberUtilsReturnFormat.NUMBER,
        ),
      ).toEqual(
        // disabling no-loss-of-precision because excessively precise inputs are possible
        // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
        3938598547899984883000000,
      );

      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          30,
          BigNumberUtilsReturnFormat.NUMBER,
        ),
      ).toEqual(
        // disabling no-loss-of-precision because excessively precise inputs are possible
        // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
        393859854789998488300000000000000000000000000,
      );

      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          Number.POSITIVE_INFINITY,
          BigNumberUtilsReturnFormat.NUMBER,
        ),
      ).toEqual(Number.POSITIVE_INFINITY);

      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          -1,
          BigNumberUtilsReturnFormat.NUMBER,
        ),
      ).toEqual(
        // disabling no-loss-of-precision because excessively precise inputs are possible
        // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
        39385985478999.84883,
      );

      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          -10,
          BigNumberUtilsReturnFormat.NUMBER,
        ),
      ).toEqual(
        // disabling no-loss-of-precision because excessively precise inputs are possible
        // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
        39385.98547899984883,
      );
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          Number.NEGATIVE_INFINITY,
          BigNumberUtilsReturnFormat.NUMBER,
        ),
      ).toEqual(0);
    });
    it('multiplies large numbers by the power of ten provided and returns them as strings', () => {
      // disabling no-loss-of-precision because excessively precise inputs are possible
      // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
      const input = 393859854789998.4883;
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          0,
          BigNumberUtilsReturnFormat.STRING,
        ),
      ).toEqual('393859854789998.5');
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          1,
          BigNumberUtilsReturnFormat.STRING,
        ),
      ).toEqual('3938598547899985');
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          2,
          BigNumberUtilsReturnFormat.STRING,
        ),
      ).toEqual('39385985478999850');
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          10,
          BigNumberUtilsReturnFormat.STRING,
        ),
      ).toEqual('3.938598547899985e+24');
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          30,
          BigNumberUtilsReturnFormat.STRING,
        ),
      ).toEqual('3.938598547899985e+44');
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          Number.POSITIVE_INFINITY,
          BigNumberUtilsReturnFormat.STRING,
        ),
      ).toEqual('Infinity');
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          -1,
          BigNumberUtilsReturnFormat.STRING,
        ),
      ).toEqual('39385985478999.85');
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          -10,
          BigNumberUtilsReturnFormat.STRING,
        ),
      ).toEqual('39385.98547899985');
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          Number.NEGATIVE_INFINITY,
          BigNumberUtilsReturnFormat.STRING,
        ),
      ).toEqual('0');
    });
    it('multiplies zero to the power of ten provided and returns the result as a number', () => {
      expect(
        multiplyValueByPowerOfTenFormatted(
          0,
          10,
          BigNumberUtilsReturnFormat.NUMBER,
        ),
      ).toEqual(0);
      expect(
        multiplyValueByPowerOfTenFormatted(
          0,
          0,
          BigNumberUtilsReturnFormat.NUMBER,
        ),
      ).toEqual(0);
      expect(
        multiplyValueByPowerOfTenFormatted(
          0,
          -10,
          BigNumberUtilsReturnFormat.NUMBER,
        ),
      ).toEqual(0);
      expect(
        multiplyValueByPowerOfTenFormatted(
          0,
          Number.POSITIVE_INFINITY,
          BigNumberUtilsReturnFormat.NUMBER,
        ),
      ).toEqual(0);
      expect(
        multiplyValueByPowerOfTenFormatted(
          0,
          Number.NEGATIVE_INFINITY,
          BigNumberUtilsReturnFormat.NUMBER,
        ),
      ).toEqual(0);
    });
    it('multiplies zero to the power of ten provided and returns the result as a string', () => {
      expect(
        multiplyValueByPowerOfTenFormatted(
          0,
          10,
          BigNumberUtilsReturnFormat.STRING,
        ),
      ).toEqual('0');
      expect(
        multiplyValueByPowerOfTenFormatted(
          0,
          0,
          BigNumberUtilsReturnFormat.STRING,
        ),
      ).toEqual('0');
      expect(
        multiplyValueByPowerOfTenFormatted(
          0,
          -10,
          BigNumberUtilsReturnFormat.STRING,
        ),
      ).toEqual('0');
      expect(
        multiplyValueByPowerOfTenFormatted(
          0,
          Number.POSITIVE_INFINITY,
          BigNumberUtilsReturnFormat.STRING,
        ),
      ).toEqual('0');
      expect(
        multiplyValueByPowerOfTenFormatted(
          0,
          Number.NEGATIVE_INFINITY,
          BigNumberUtilsReturnFormat.STRING,
        ),
      ).toEqual('0');
    });
    it('multiplies infinity to the power of ten provided and returns the result as a number', () => {
      const input = Number.POSITIVE_INFINITY;
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          10,
          BigNumberUtilsReturnFormat.NUMBER,
        ),
      ).toEqual(Number.POSITIVE_INFINITY);
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          0,
          BigNumberUtilsReturnFormat.NUMBER,
        ),
      ).toEqual(Number.POSITIVE_INFINITY);
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          -10,
          BigNumberUtilsReturnFormat.NUMBER,
        ),
      ).toEqual(Number.POSITIVE_INFINITY);
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          Number.POSITIVE_INFINITY,
          BigNumberUtilsReturnFormat.NUMBER,
        ),
      ).toEqual(Number.POSITIVE_INFINITY);
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          Number.NEGATIVE_INFINITY,
          BigNumberUtilsReturnFormat.NUMBER,
        ),
      ).toEqual(0);
    });
    it('multiplies infinity to the power of ten provided and returns the result as a string', () => {
      const input = Number.POSITIVE_INFINITY;
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          10,
          BigNumberUtilsReturnFormat.STRING,
        ),
      ).toEqual('Infinity');
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          0,
          BigNumberUtilsReturnFormat.STRING,
        ),
      ).toEqual('Infinity');
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          -10,
          BigNumberUtilsReturnFormat.STRING,
        ),
      ).toEqual('Infinity');
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          Number.POSITIVE_INFINITY,
          BigNumberUtilsReturnFormat.STRING,
        ),
      ).toEqual('Infinity');
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          Number.NEGATIVE_INFINITY,
          BigNumberUtilsReturnFormat.STRING,
        ),
      ).toEqual('0');
    });
    it('multiplies negative infinity to the power of ten provided and returns the result as a number', () => {
      const input = Number.NEGATIVE_INFINITY;
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          10,
          BigNumberUtilsReturnFormat.NUMBER,
        ),
      ).toEqual(Number.NEGATIVE_INFINITY);
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          0,
          BigNumberUtilsReturnFormat.NUMBER,
        ),
      ).toEqual(Number.NEGATIVE_INFINITY);
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          -10,
          BigNumberUtilsReturnFormat.NUMBER,
        ),
      ).toEqual(Number.NEGATIVE_INFINITY);
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          Number.POSITIVE_INFINITY,
          BigNumberUtilsReturnFormat.NUMBER,
        ),
      ).toEqual(Number.NEGATIVE_INFINITY);
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          Number.NEGATIVE_INFINITY,
          BigNumberUtilsReturnFormat.NUMBER,
        ),
      ).toEqual(0);
    });
    it('multiplies negative infinity to the power of ten provided and returns the result as a string', () => {
      const input = Number.NEGATIVE_INFINITY;
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          10,
          BigNumberUtilsReturnFormat.STRING,
        ),
      ).toEqual('-Infinity');
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          0,
          BigNumberUtilsReturnFormat.STRING,
        ),
      ).toEqual('-Infinity');
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          -10,
          BigNumberUtilsReturnFormat.STRING,
        ),
      ).toEqual('-Infinity');
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          Number.POSITIVE_INFINITY,
          BigNumberUtilsReturnFormat.STRING,
        ),
      ).toEqual('-Infinity');
      expect(
        multiplyValueByPowerOfTenFormatted(
          input,
          Number.NEGATIVE_INFINITY,
          BigNumberUtilsReturnFormat.STRING,
        ),
      ).toEqual('0');
    });
  });
  describe('getBigNumberFromBN', () => {
    it('handles BN.js big number inputs and returns a BigNumber', () => {
      expect(getBigNumberFromBN(BN.from(0))).toEqual(new BigNumber(0));
      expect(getBigNumberFromBN(BN.from(1))).toEqual(new BigNumber(1));
      expect(getBigNumberFromBN(BN.from(-1))).toEqual(new BigNumber(-1));
    });
  });
});
