import { GasFeeToken, TransactionMeta } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { act } from '@testing-library/react';

import { useAutomaticGasFeeTokenSelect } from './useAutomaticGasFeeTokenSelect';
import { useIsGaslessSupported } from './gas/useIsGaslessSupported';
import { merge } from 'lodash';
import { contractDeploymentTransactionStateMock } from '../__mocks__/contract-deployment-transaction-mock';
import { toHex } from 'viem';
import {
  ProviderValues,
  renderHookWithProvider,
} from '../../../../util/test/renderWithProvider';
import { updateSelectedGasFeeToken } from '../../../../util/transaction-controller';
import { NATIVE_TOKEN_ADDRESS } from '../constants/tokens';
import { useHasInsufficientBalance } from './useHasInsufficientBalance';

jest.mock('./useHasInsufficientBalance');
jest.mock('../../../../util/transaction-controller');
jest.mock('./gas/useIsGaslessSupported');

const FROM_MOCK = '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc';
export const GAS_FEE_TOKEN_MOCK: GasFeeToken = {
  amount: toHex(1000),
  balance: toHex(2345),
  decimals: 3,
  gas: '0x3',
  gasTransfer: '0x3a',
  maxFeePerGas: '0x4',
  maxPriorityFeePerGas: '0x5',
  rateWei: toHex('1798170000000000000'),
  recipient: '0x1234567890123456789012345678901234567890',
  symbol: 'TEST',
  tokenAddress: '0x1234567890123456789012345678901234567890',
};

function getState({
  gasFeeTokens,
  selectedGasFeeToken,
}: { gasFeeTokens?: GasFeeToken[]; selectedGasFeeToken?: Hex } = {}): {
  state: ProviderValues['state'];
} {
  const state = merge({}, contractDeploymentTransactionStateMock, {
    engine: {
      backgroundState: {
        TransactionController: {
          transactions: [
            {
              id: '699ca2f0-e459-11ef-b6f6-d182277cf5e1',
              address: FROM_MOCK,
              gasFeeTokens: gasFeeTokens ?? [GAS_FEE_TOKEN_MOCK],
              selectedGasFeeToken,
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
  selectedGasFeeToken,
}: {
  gasFeeTokens?: GasFeeToken[];
  selectedGasFeeToken?: Hex;
} = {}) {
  const { state } = getState({ gasFeeTokens, selectedGasFeeToken });

  const result = renderHookWithProvider(useAutomaticGasFeeTokenSelect, {
    state,
  });

  return { ...result, state };
}

describe('useAutomaticGasFeeTokenSelect', () => {
  const updateSelectedGasFeeTokenMock = jest.mocked(updateSelectedGasFeeToken);
  const useIsGaslessSupportedMock = jest.mocked(useIsGaslessSupported);

  const useHasInsufficientBalanceMock = jest.mocked(useHasInsufficientBalance);

  beforeEach(() => {
    jest.resetAllMocks();
    useHasInsufficientBalanceMock.mockReturnValue({
      hasInsufficientBalance: false,
    });
    updateSelectedGasFeeTokenMock.mockReturnValue();

    useIsGaslessSupportedMock.mockReturnValue({
      isSupported: true,
      isSmartTransaction: true,
      pending: false,
    });
  });

  it('selects first gas fee token', () => {
    useHasInsufficientBalanceMock.mockReturnValue({
      hasInsufficientBalance: true,
    });
    runHook();

    expect(updateSelectedGasFeeTokenMock).toHaveBeenCalledTimes(1);
    expect(updateSelectedGasFeeTokenMock).toHaveBeenCalledWith(
      expect.any(String),
      GAS_FEE_TOKEN_MOCK.tokenAddress,
    );
  });

  it('does not select first gas fee token if gas fee token already selected', () => {
    runHook({ selectedGasFeeToken: GAS_FEE_TOKEN_MOCK.tokenAddress });
    expect(updateSelectedGasFeeTokenMock).toHaveBeenCalledTimes(0);
  });

  it('does not select first gas fee token if no gas fee tokens', () => {
    runHook({ gasFeeTokens: [] });
    expect(updateSelectedGasFeeTokenMock).toHaveBeenCalledTimes(0);
  });

  it('does not select first gas fee token if not first load', () => {
    const { rerender, state } = runHook({
      selectedGasFeeToken: GAS_FEE_TOKEN_MOCK.tokenAddress,
    });

    const transactionMeta = state?.engine?.backgroundState
      ?.TransactionController?.transactions?.[0] as unknown as TransactionMeta;

    act(() => {
      transactionMeta.selectedGasFeeToken = undefined;
    });

    rerender({});

    expect(updateSelectedGasFeeTokenMock).toHaveBeenCalledTimes(0);
  });

  it('does not select first gas fee token if gasless not supported', () => {
    useIsGaslessSupportedMock.mockReturnValue({
      isSupported: false,
      isSmartTransaction: false,
      pending: false,
    });

    runHook();

    expect(updateSelectedGasFeeTokenMock).toHaveBeenCalledTimes(0);
  });

  it('does not select first gas fee token if sufficient balance', () => {
    runHook();
    expect(updateSelectedGasFeeTokenMock).toHaveBeenCalledTimes(0);
  });

  it('does not select first gas fee token after firstCheck is set to false', () => {
    useHasInsufficientBalanceMock.mockReturnValue({
      hasInsufficientBalance: true,
    });
    const { rerender, state } = runHook();
    // Simulate a rerender with new state that would otherwise trigger selection
    act(() => {
      (
        state?.engine?.backgroundState?.TransactionController
          ?.transactions?.[0] as unknown as TransactionMeta
      ).selectedGasFeeToken = undefined;
    });
    rerender({});
    expect(updateSelectedGasFeeTokenMock).toHaveBeenCalledTimes(1); // Only first run
  });

  it('does not select if gasFeeTokens is falsy', () => {
    runHook({ gasFeeTokens: [] });
    expect(updateSelectedGasFeeTokenMock).toHaveBeenCalledTimes(0);
  });

  it('does not select first gas fee token if 7702 and future native token', () => {
    useIsGaslessSupportedMock.mockReturnValue({
      isSupported: true,
      isSmartTransaction: false,
      pending: false,
    });

    runHook({
      gasFeeTokens: [
        {
          ...GAS_FEE_TOKEN_MOCK,
          tokenAddress: NATIVE_TOKEN_ADDRESS,
        },
      ],
    });

    expect(updateSelectedGasFeeTokenMock).toHaveBeenCalledTimes(0);
  });

  it('selects second gas fee token if 7702 and future native token', () => {
    useIsGaslessSupportedMock.mockReturnValue({
      isSupported: true,
      isSmartTransaction: false,
      pending: false,
    });
    useHasInsufficientBalanceMock.mockReturnValue({
      hasInsufficientBalance: true,
    });

    runHook({
      gasFeeTokens: [
        {
          ...GAS_FEE_TOKEN_MOCK,
          tokenAddress: NATIVE_TOKEN_ADDRESS,
        },
        GAS_FEE_TOKEN_MOCK,
      ],
    });

    expect(updateSelectedGasFeeTokenMock).toHaveBeenCalledTimes(1);
  });
});
