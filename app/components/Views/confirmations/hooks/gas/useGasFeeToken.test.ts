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

jest.mock('./gas/useFeeCalculations');
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
        PreferencesController: {
          showFiatInTestnets: true,
        },
        CurrencyRateController: {
          currentCurrency: 'USD',
          currencyRates: {
            ETH: {
              conversionDate: 1732887955.694,
              conversionRate: 3596.25,
              usdConversionRate: 3596.25,
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
    expect(result.amountFiat).toStrictEqual('$7,979.87');
  });

  it('returns fiat balance', () => {
    const result = runHook({ tokenAddress: GAS_FEE_TOKEN_MOCK.tokenAddress });
    expect(result.balanceFiat).toStrictEqual('$15,164.34');
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
        amountFiat: '$7,979.87',
        amountFormatted: '1.234',
        balanceFiat: '$15,164.34',
      }),
    );
  });
});
