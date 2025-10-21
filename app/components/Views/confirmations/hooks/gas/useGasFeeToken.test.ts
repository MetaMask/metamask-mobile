import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import {
  RATE_WEI_NATIVE,
  useGasFeeToken,
  useSelectedGasFeeToken,
} from './useGasFeeToken';
import { transferTransactionStateMock } from '../../__mocks__/transfer-transaction-mock';
import { NATIVE_TOKEN_ADDRESS } from '../../constants/tokens';
import { useFeeCalculations } from './useFeeCalculations';
import { toHex } from '@metamask/controller-utils';
import { GasFeeToken } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { merge } from 'lodash';
import BigNumber from 'bignumber.js';

jest.mock('./useFeeCalculations');

const FROM_MOCK = '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc';

const GAS_FEE_TOKEN_MOCK: GasFeeToken = {
  amount: toHex(1234),
  balance: toHex(2345),
  decimals: 3,
  gas: '0x3',
  gasTransfer: '0x3a',
  maxFeePerGas: '0x4',
  maxPriorityFeePerGas: '0x5',
  rateWei: toHex('1798170000000000000'),
  recipient: '0x1234567890123456789012345678901234567890',
  symbol: 'USDC',
  tokenAddress: '0x1234567890123456789012345678901234567890',
};

function getState({ gasFeeTokens }: { gasFeeTokens?: GasFeeToken[] } = {}) {
  const state = merge({}, transferTransactionStateMock, {
    engine: {
      backgroundState: {
        TransactionController: {
          transactions: [
            {
              id: '699ca2f0-e459-11ef-b6f6-d182277cf5e1',
              address: FROM_MOCK,
              gasFeeTokens: gasFeeTokens ?? [GAS_FEE_TOKEN_MOCK],
              selectedGasFeeToken: GAS_FEE_TOKEN_MOCK.tokenAddress,
            },
          ],
        },
        CurrencyRateController: {
          currentCurrency: 'USD',
          currencyRates: {
            ETH: {
              conversionDate: 1732887955.694,
              conversionRate: 556.12,
              usdConversionRate: 556.12,
            },
          },
        },
      },
    },
  });
  return { state };
}

function runHook({
  gasFeeTokens,
  tokenAddress,
}: {
  gasFeeTokens?: GasFeeToken[];
  tokenAddress?: Hex;
}) {
  const state = getState({ gasFeeTokens });
  const { result } = renderHookWithProvider(
    () => useGasFeeToken({ tokenAddress }),
    state,
  );
  return result.current;
}

function runUseSelectedGasFeeTokenHook() {
  const { result } = renderHookWithProvider(useSelectedGasFeeToken, getState());
  return result.current;
}

describe('useGasFeeToken', () => {
  const useFeeCalculationsMock = jest.mocked(useFeeCalculations);

  beforeEach(() => {
    jest.clearAllMocks();
    useFeeCalculationsMock.mockReturnValue({
      preciseNativeFeeInHex: '0x1',
      estimatedFeeFiat: null,
      estimatedFeeNative: null,
      estimatedFeeFiatPrecise: null,
      maxFeeFiat: null,
      maxFeeNative: null,
      maxFeeNativePrecise: null,
      maxFeeNativeHex: null,
      calculateGasEstimate: jest.fn(),
    } as ReturnType<typeof useFeeCalculations>);
  });

  it('returns gas fee token properties', () => {
    const result = runHook({ tokenAddress: GAS_FEE_TOKEN_MOCK.tokenAddress });
    expect(result).toStrictEqual(expect.objectContaining(GAS_FEE_TOKEN_MOCK));
  });

  it('returns formatted amount', () => {
    const result = runHook({ tokenAddress: GAS_FEE_TOKEN_MOCK.tokenAddress });
    expect(result.amountFormatted).toStrictEqual('1.234');
  });

  it('returns fiat amount', () => {
    const result = runHook({ tokenAddress: GAS_FEE_TOKEN_MOCK.tokenAddress });
    expect(result.amountFiat).toStrictEqual('$1,234.00');
  });

  it('returns fiat balance', () => {
    const result = runHook({ tokenAddress: GAS_FEE_TOKEN_MOCK.tokenAddress });
    expect(result.balanceFiat).toStrictEqual('$2,345.00');
  });

  it('returns token transfer transaction', () => {
    const result = runHook({ tokenAddress: GAS_FEE_TOKEN_MOCK.tokenAddress });
    expect(result.transferTransaction).toStrictEqual({
      data: `0xa9059cbb000000000000000000000000${GAS_FEE_TOKEN_MOCK.recipient.slice(
        2,
      )}00000000000000000000000000000000000000000000000000000000000004d2`,
      gas: GAS_FEE_TOKEN_MOCK.gasTransfer,
      maxFeePerGas: GAS_FEE_TOKEN_MOCK.maxFeePerGas,
      maxPriorityFeePerGas: GAS_FEE_TOKEN_MOCK.maxPriorityFeePerGas,
      to: GAS_FEE_TOKEN_MOCK.tokenAddress,
    });
  });

  it('returns native transfer tranasction if future native token', () => {
    const result = runHook({
      gasFeeTokens: [
        { ...GAS_FEE_TOKEN_MOCK, tokenAddress: NATIVE_TOKEN_ADDRESS },
      ],
      tokenAddress: NATIVE_TOKEN_ADDRESS,
    });
    expect(result.transferTransaction).toStrictEqual({
      gas: GAS_FEE_TOKEN_MOCK.gasTransfer,
      maxFeePerGas: GAS_FEE_TOKEN_MOCK.maxFeePerGas,
      maxPriorityFeePerGas: GAS_FEE_TOKEN_MOCK.maxPriorityFeePerGas,
      to: GAS_FEE_TOKEN_MOCK.recipient,
      value: GAS_FEE_TOKEN_MOCK.amount,
    });
  });

  it('returns native gas fee token if no token address', () => {
    const result = runHook({ tokenAddress: undefined });
    expect(result.tokenAddress).toStrictEqual(NATIVE_TOKEN_ADDRESS);
  });

  it('returns token transfer transaction when tokenAddress is not the native token address', () => {
    const result = runHook({ tokenAddress: GAS_FEE_TOKEN_MOCK.tokenAddress });
    expect(result.transferTransaction).toEqual(
      expect.objectContaining({
        to: GAS_FEE_TOKEN_MOCK.tokenAddress,
        data: expect.any(String),
      }),
    );
  });

  describe('MetaMask fee calculation', () => {
    it('uses provided fee property when available', () => {
      const customFee = toHex(500); // Custom fee of 500
      const tokenWithFee: GasFeeToken = {
        ...GAS_FEE_TOKEN_MOCK,
        fee: customFee,
      };

      const result = runHook({
        gasFeeTokens: [tokenWithFee],
        tokenAddress: tokenWithFee.tokenAddress,
      });

      expect(result.metaMaskFee).toStrictEqual(customFee);
    });

    it('calculates correct metamaskFeeFiat when fee property is provided', () => {
      const customFee = toHex(1000);
      const tokenWithFee: GasFeeToken = {
        ...GAS_FEE_TOKEN_MOCK,
        fee: customFee,
      };

      const result = runHook({
        gasFeeTokens: [tokenWithFee],
        tokenAddress: tokenWithFee.tokenAddress,
      });

      expect(result.metamaskFeeFiat).toBeDefined();
      expect(result.metamaskFeeFiat).not.toBe('');
    });

    it('calculates correct metamaskFeeFiat when fee property is not provided', () => {
      const tokenWithoutFee: GasFeeToken = {
        ...GAS_FEE_TOKEN_MOCK,
        fee: undefined,
      };

      const result = runHook({
        gasFeeTokens: [tokenWithoutFee],
        tokenAddress: tokenWithoutFee.tokenAddress,
      });

      expect(result.metamaskFeeFiat).toBeDefined();
      expect(result.metamaskFeeFiat).not.toBe('');
    });

    it('handles zero fee value', () => {
      const tokenWithZeroFee: GasFeeToken = {
        ...GAS_FEE_TOKEN_MOCK,
        fee: '0x0',
      };

      const result = runHook({
        gasFeeTokens: [tokenWithZeroFee],
        tokenAddress: tokenWithZeroFee.tokenAddress,
      });

      expect(result.metaMaskFee).toStrictEqual('0x0');
      expect(result.metamaskFeeFiat).toBeDefined();
    });

    it('preserves fee precision when provided', () => {
      const preciseCustomFee = toHex(123456789);
      const tokenWithPreciseFee: GasFeeToken = {
        ...GAS_FEE_TOKEN_MOCK,
        fee: preciseCustomFee,
      };

      const result = runHook({
        gasFeeTokens: [tokenWithPreciseFee],
        tokenAddress: tokenWithPreciseFee.tokenAddress,
      });

      expect(result.metaMaskFee).toStrictEqual(preciseCustomFee);
    });

    it('calculates percentage-based fee correctly for large amounts', () => {
      const largeAmount = toHex(new BigNumber('1000000000000').toNumber());
      const expectedFee = '0x03b9aca00' as Hex;
      const tokenWithLargeAmount: GasFeeToken = {
        ...GAS_FEE_TOKEN_MOCK,
        amount: largeAmount,
        fee: expectedFee,
      };

      const result = runHook({
        gasFeeTokens: [tokenWithLargeAmount],
        tokenAddress: tokenWithLargeAmount.tokenAddress,
      });

      expect(result.metaMaskFee).toStrictEqual(expectedFee);
    });

    it('uses fee property over calculated percentage when both are applicable', () => {
      const customFee = toHex(999);
      const tokenWithBothValues: GasFeeToken = {
        ...GAS_FEE_TOKEN_MOCK,
        amount: toHex(10000),
        fee: customFee,
      };

      const result = runHook({
        gasFeeTokens: [tokenWithBothValues],
        tokenAddress: tokenWithBothValues.tokenAddress,
      });

      // Should use the provided fee, not the calculated one
      expect(result.metaMaskFee).toStrictEqual(customFee);
    });
  });
});

describe('returns native gas fee token', () => {
  it('with amount matching standard min fee calculation', () => {
    const result = runHook({ tokenAddress: NATIVE_TOKEN_ADDRESS });
    expect(result).toStrictEqual(
      expect.objectContaining({
        amount: '0x1',
        amountFiat: '< $0.01',
        amountFormatted: '< 0.000001',
      }),
    );
  });

  it('with gas properties matching transaction params', () => {
    const result = runHook({ tokenAddress: NATIVE_TOKEN_ADDRESS });
    expect(result).toStrictEqual(
      expect.objectContaining({
        gas: '0x664e',
        maxFeePerGas: '0xcdfe60',
        maxPriorityFeePerGas: '0x012345',
      }),
    );
  });

  it('with symbol as native ticker', () => {
    const result = runHook({ tokenAddress: NATIVE_TOKEN_ADDRESS });
    expect(result).toStrictEqual(
      expect.objectContaining({
        symbol: 'ETH',
      }),
    );
  });

  it('with static data', () => {
    const result = runHook({ tokenAddress: NATIVE_TOKEN_ADDRESS });
    expect(result).toStrictEqual(
      expect.objectContaining({
        decimals: 18,
        rateWei: RATE_WEI_NATIVE,
        recipient: NATIVE_TOKEN_ADDRESS,
        tokenAddress: NATIVE_TOKEN_ADDRESS,
      }),
    );
  });
});

describe('useSelectedGasFeeToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns selected gas fee token properties', () => {
    const result = runUseSelectedGasFeeTokenHook();
    expect(result).toEqual(
      expect.objectContaining({
        ...GAS_FEE_TOKEN_MOCK,
        amountFiat: '$1,234.00',
        amountFormatted: '1.234',
        balanceFiat: '$2,345.00',
      }),
    );
  });

  it('returns selected gas fee token with custom fee when provided', () => {
    const customFee = toHex(750);
    const tokenWithCustomFee: GasFeeToken = {
      ...GAS_FEE_TOKEN_MOCK,
      fee: customFee,
    };

    const state = getState({ gasFeeTokens: [tokenWithCustomFee] });
    const { result } = renderHookWithProvider(useSelectedGasFeeToken, state);

    expect(result.current).toEqual(
      expect.objectContaining({
        metaMaskFee: customFee,
      }),
    );
  });
});
