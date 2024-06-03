import BigNumber from 'bignumber.js';
import { getEstimatedSafeGasLimit, isValidDestinationAmount } from './utils';
import { Quote } from '@metamask/swaps-controller/dist/swapsInterfaces';

const getQuote = (overrides: any): Quote => ({
  trade: {
    data: '0x5f57552900000000000000000000000000000000000000000000000000000000000000800000000000000000000000006b175474e89094c44da98b954eedeac495271d0f0000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000001c616972737761704c696768743446656544796e616d696346697865640000000000000000000000000000000000000000000000000000000000000000000001a00000000000000000000000000000000000000000000000000000018fd001165100000000000000000000000000000000000000000000000000000000665a1d4d0000000000000000000000000f4a4b5a9935544190a6eaf34ec5a343738d4166000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000000f1d220000000000000000000000006b175474e89094c44da98b954eedeac495271d0f0000000000000000000000000000000000000000000000000dc1a09f859b2000000000000000000000000000000000000000000000000000000000000000001c09d36533fe31c5b9d9ed722e94a72a2d05b8b4ee5fa130a08efd2d32d5bef6a05b56af337c4e72e695dfe649480a62494e15593e02a618dc66068e5f0ff267c0000000000000000000000000000000000000000000000000001f161421c8e0000000000000000000000000002acf35c9a3f4c5c3f4c78ef5fb64c3ee82f07c4500000000000000000000000000000000000000000000000000000000000000000090',
    from: '0xb0da5965d43369968574d399dbe6374683773a65',
    value: '0',
    to: '0x881D40237659C251811CEC9c364ef91dC08D300C',
  },
  hasRoute: false,
  sourceAmount: '1000000000000000000',
  destinationAmount: '990498',
  error: null,
  sourceToken: '0x6b175474e89094c44da98b954eedeac495271d0f',
  destinationToken: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  maxGas: 238259,
  averageGas: 192631,
  estimatedRefund: 45628,
  approvalNeeded: null,
  fetchTime: 2632,
  aggregator: 'airswapV4',
  aggType: 'RFQ',
  fee: 0.875,
  quoteRefreshSeconds: 30,
  gasMultiplier: 1,
  sourceTokenRate: 0.00026422700217108885,
  destinationTokenRate: 0.00026440760737655387,
  ...overrides,
});

describe('utils', () => {
  describe('getEstimatedSafeGasLimit', () => {
    it('multiplies gas limit by multiplier', () => {
      const res = getEstimatedSafeGasLimit('123', 2);
      expect(res).toEqual(new BigNumber('246'));
    });

    const invalidValues = [
      { value: undefined },
      { value: null },
      { value: 'asd' },
      { value: NaN },
      { value: Infinity },
      { value: -Infinity },
      { value: {} },
      { value: [] },
    ];

    it.each(invalidValues)(
      'returns undefined for invalid gasLimit $value and valid multiplier',
      ({ value }) => {
        // @ts-expect-error Invalid args can occur if fn consumed in JS file
        expect(getEstimatedSafeGasLimit(value, 2)).toBe(undefined);
      },
    );

    it.each(invalidValues)(
      'returns undefined for valid gasLimit and invalid multiplier $value',
      ({ value }) => {
        // @ts-expect-error Invalid args can occur if fn consumed in JS file
        expect(getEstimatedSafeGasLimit('123', value)).toBe(undefined);
      },
    );

    invalidValues.forEach(({ value: gasLimit }) => {
      invalidValues.forEach(({ value: multiplier }) => {
        it(`returns undefined for invalid gasLimit ${gasLimit} and invalid multiplier ${multiplier}`, () => {
          // @ts-expect-error Invalid args can occur if fn consumed in JS file
          expect(getEstimatedSafeGasLimit(gasLimit, multiplier)).toBe(
            undefined,
          );
        });
      });
    });

    it('returns undefined if error is thrown', () => {
      jest.spyOn(BigNumber.prototype, 'times').mockImplementation(() => {
        throw new Error('Test error');
      });
      const res = getEstimatedSafeGasLimit('asd', 2);
      expect(res).toEqual(undefined);

      // @ts-expect-error We mocked this earlier, so restore it
      BigNumber.prototype.times.mockRestore();
    });
  });
  describe('isValidDestinationAmount', () => {
    it('returns true for valid destinationAmount', () => {
      const quote = { destinationAmount: '100' };
      expect(isValidDestinationAmount(getQuote(quote))).toBe(true);
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
        expect(isValidDestinationAmount(getQuote(quote))).toBe(false);
      },
    );

    it('return false when destinationAmount is not provided', () => {
      const quote = {
        destinationAmount: undefined,
      };
      expect(isValidDestinationAmount(getQuote(quote))).toBe(false);
    });
  });
});
