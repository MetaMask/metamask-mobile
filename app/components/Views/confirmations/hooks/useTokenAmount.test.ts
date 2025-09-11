import { TransactionType } from '@metamask/transaction-controller';
import { merge } from 'lodash';
import { waitFor } from '@testing-library/react-native';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import {
  stakingDepositConfirmationState,
  transferConfirmationState,
} from '../../../../util/test/confirm-data-helpers';
import { useTokenAmount } from './useTokenAmount';
import {
  accountsControllerMock,
  tokenAddress1Mock,
  tokensControllerMock,
} from '../__mocks__/controllers/other-controllers-mock';
import { updateEditableParams } from '../../../../util/transaction-controller';

jest.mock('../../../../util/transaction-controller');

jest.mock('./useNetworkInfo', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    networkNativeCurrency: 'ETH',
  })),
}));

const mockData =
  '0xa9059cbb000000000000000000000000d8da6bf26964af9d7eed9e03e53415d37aa96045000000000000000000000000000000000000000000000000016345785d8a0000';

describe('useTokenAmount', () => {
  describe('returns amount and fiat display values', () => {
    it('for a transfer type transaction', async () => {
      const { result } = renderHookWithProvider(() => useTokenAmount(), {
        state: transferConfirmationState,
      });

      await waitFor(async () => {
        expect(result.current).toEqual(
          expect.objectContaining({
            amount: '0.0001',
            amountPrecise: '0.0001',
            fiat: '$0.36',
            isNative: true,
            usdValue: '0.36',
          }),
        );
      });
    });

    it('for a staking deposit', async () => {
      const { result } = renderHookWithProvider(() => useTokenAmount(), {
        state: stakingDepositConfirmationState,
      });

      await waitFor(async () => {
        expect(result.current).toEqual(
          expect.objectContaining({
            amount: '0.0001',
            amountPrecise: '0.0001',
            fiat: '$0.36',
            isNative: true,
            usdValue: '0.36',
          }),
        );
      });
    });

    it('for a staking deposit and with amountWei defined', async () => {
      const { result } = renderHookWithProvider(
        () => useTokenAmount({ amountWei: '1000000000000000' }),
        {
          state: stakingDepositConfirmationState,
        },
      );

      await waitFor(() => {
        expect(result.current).toEqual(
          expect.objectContaining({
            amount: '0.001',
            amountPrecise: '0.001',
            fiat: '$3.60',
            isNative: true,
            usdValue: '3.60',
          }),
        );
      });
    });
  });
});

describe('ERC20 token transactions', () => {
  const erc20TokenAddress = '0x6b175474e89094c44da98b954eedeac495271d0f';
  const checksumErc20TokenAddress =
    '0x6B175474E89094C44Da98b954EedeAC495271d0F';
  const updateEditableParamsMock = jest.mocked(updateEditableParams);

  const createERC20State = (contractExchangeRate = 1.5) =>
    merge({}, transferConfirmationState, {
      engine: {
        backgroundState: {
          TokenRatesController: {
            marketData: {
              '0x1': {
                [checksumErc20TokenAddress]: {
                  price: contractExchangeRate,
                },
              },
            },
          },
          TransactionController: {
            transactions: [
              {
                type: TransactionType.tokenMethodTransfer,
                txParams: {
                  to: erc20TokenAddress,
                  data: mockData,
                  from: '0xdc47789de4ceff0e8fe9d15d728af7f17550c164',
                },
              },
            ],
          },
        },
      },
    });

  it('calculates correct fiat and USD values for ERC20 token transfer', async () => {
    const { result } = renderHookWithProvider(() => useTokenAmount(), {
      state: createERC20State(1.5),
    });

    await waitFor(() => {
      expect(result.current).toEqual(
        expect.objectContaining({
          amount: '0.1',
          amountPrecise: '0.1',
          fiat: '$539.44', // 0.1 * 3596.25 * 1.5
          isNative: false,
          usdValue: '539.44',
        }),
      );
    });
  });

  it('handles zero contract exchange rate correctly', async () => {
    const { result } = renderHookWithProvider(() => useTokenAmount(), {
      state: createERC20State(0),
    });

    await waitFor(() => {
      expect(result.current).toEqual(
        expect.objectContaining({
          amount: '0.1',
          amountPrecise: '0.1',
          fiat: '$0',
          isNative: false,
          usdValue: '0.00',
        }),
      );
    });
  });

  it('handles missing contract exchange rate (undefined)', async () => {
    const stateWithoutExchangeRate = merge({}, transferConfirmationState, {
      engine: {
        backgroundState: {
          TokenRatesController: {
            marketData: {
              '0x1': {}, // No exchange rate for this token
            },
          },
          TransactionController: {
            transactions: [
              {
                type: TransactionType.tokenMethodTransfer,
                txParams: {
                  to: erc20TokenAddress,
                  data: mockData,
                  from: '0xdc47789de4ceff0e8fe9d15d728af7f17550c164',
                },
              },
            ],
          },
        },
      },
    });

    const { result } = renderHookWithProvider(() => useTokenAmount(), {
      state: stateWithoutExchangeRate,
    });

    await waitFor(() => {
      expect(result.current).toEqual(
        expect.objectContaining({
          amount: '0.1',
          amountPrecise: '0.1',
          fiat: '$0',
          isNative: false,
          usdValue: '0.00',
        }),
      );
    });
  });

  it('works for contractInteraction transaction type', async () => {
    const contractInteractionState = merge({}, createERC20State(2.0), {
      engine: {
        backgroundState: {
          TransactionController: {
            transactions: [
              {
                type: TransactionType.contractInteraction,
                txParams: {
                  to: erc20TokenAddress,
                  data: mockData,
                  from: '0xdc47789de4ceff0e8fe9d15d728af7f17550c164',
                },
              },
            ],
          },
        },
      },
    });

    const { result } = renderHookWithProvider(() => useTokenAmount(), {
      state: contractInteractionState,
    });

    await waitFor(() => {
      expect(result.current).toEqual(
        expect.objectContaining({
          amount: '0.1',
          amountPrecise: '0.1',
          isNative: false,
          fiat: '$719.25', // 0.1 * 3596.25 * 2.0
          usdValue: '719.25',
        }),
      );
    });
  });

  it('gets token decimals from state if available', async () => {
    const state = merge(
      createERC20State(),
      tokensControllerMock,
      accountsControllerMock,
    );

    state.engine.backgroundState.TransactionController.transactions[0].txParams.to =
      tokenAddress1Mock;

    const { result } = renderHookWithProvider(() => useTokenAmount(), {
      state,
    });

    await waitFor(() => {
      expect(result.current.amountUnformatted).toBe('10000000000000');
    });
  });

  it('can update transfer amount in transaction data', async () => {
    const state = merge(
      createERC20State(),
      tokensControllerMock,
      accountsControllerMock,
    );

    state.engine.backgroundState.TransactionController.transactions[0].txParams.to =
      tokenAddress1Mock;

    const { result } = renderHookWithProvider(() => useTokenAmount(), {
      state,
    });

    result.current.updateTokenAmount('20000000000000');

    expect(updateEditableParamsMock).toHaveBeenCalledWith(expect.any(String), {
      data: '0xa9059cbb000000000000000000000000d8da6bf26964af9d7eed9e03e53415d37aa9604500000000000000000000000000000000000000000000000002c68af0bb140000',
      updateType: false,
    });
  });

  it('returns native amount', async () => {
    const { result } = renderHookWithProvider(() => useTokenAmount(), {
      state: createERC20State(),
    });

    await waitFor(() => {
      expect(result.current.amountNative).toBe('0.15');
    });
  });
});

describe('Edge cases', () => {
  it('handles very small USD amounts that result in zero', async () => {
    const smallExchangeRateState = merge({}, transferConfirmationState, {
      engine: {
        backgroundState: {
          TokenRatesController: {
            marketData: {
              '0x1': {
                '0x6B175474E89094C44Da98b954EedeAC495271d0F': {
                  price: 0.000000001, // Very small exchange rate
                },
              },
            },
          },
          TransactionController: {
            transactions: [
              {
                type: TransactionType.tokenMethodTransfer,
                txParams: {
                  to: '0x6b175474e89094c44da98b954eedeac495271d0f',
                  data: mockData,
                  from: '0xdc47789de4ceff0e8fe9d15d728af7f17550c164',
                },
              },
            ],
          },
        },
      },
    });

    const { result } = renderHookWithProvider(() => useTokenAmount(), {
      state: smallExchangeRateState,
    });

    await waitFor(() => {
      expect(result.current.usdValue).toBe(null);
    });
  });

  it('maintains consistent behavior for native token calculations', async () => {
    const { result } = renderHookWithProvider(() => useTokenAmount(), {
      state: stakingDepositConfirmationState,
    });

    await waitFor(() => {
      expect(result.current).toEqual(
        expect.objectContaining({
          amount: '0.0001',
          amountPrecise: '0.0001',
          fiat: '$0.36',
          isNative: true,
          usdValue: '0.36',
        }),
      );
    });
  });

  it('handles null/undefined TokenRatesController gracefully', async () => {
    const stateWithoutTokenRates = merge({}, transferConfirmationState, {
      engine: {
        backgroundState: {
          TokenRatesController: {
            marketData: {},
          },
          TransactionController: {
            transactions: [
              {
                type: TransactionType.tokenMethodTransfer,
                txParams: {
                  to: '0x6b175474e89094c44da98b954eedeac495271d0f',
                  data: mockData,
                  from: '0xdc47789de4ceff0e8fe9d15d728af7f17550c164',
                },
              },
            ],
          },
        },
      },
    });

    const { result } = renderHookWithProvider(() => useTokenAmount(), {
      state: stateWithoutTokenRates,
    });

    await waitFor(() => {
      expect(result.current).toEqual(
        expect.objectContaining({
          amount: '0.1',
          amountPrecise: '0.1',
          fiat: '$0',
          isNative: false,
          usdValue: '0.00',
        }),
      );
    });
  });

  it('calculates USD value when usdConversionRateFromCurrencyRates is not available', async () => {
    const stateWithoutUsdRate = merge({}, transferConfirmationState, {
      engine: {
        backgroundState: {
          CurrencyRateController: {
            currentCurrency: 'usd',
            currencyRates: {
              ETH: {
                conversionDate: 1732887955.694,
                conversionRate: 3596.25,
                usdConversionRate: null,
              },
            },
          },
        },
      },
    });

    const { result } = renderHookWithProvider(() => useTokenAmount(), {
      state: stateWithoutUsdRate,
    });

    await waitFor(() => {
      expect(result.current).toEqual(
        expect.objectContaining({
          amount: '0.0001',
          amountPrecise: '0.0001',
          fiat: '$0.36',
          isNative: true,
          usdValue: null,
        }),
      );
    });
  });

  it('returns unformatted amount', async () => {
    const { result } = renderHookWithProvider(() => useTokenAmount(), {
      state: transferConfirmationState,
    });

    await waitFor(() => {
      expect(result.current.amountUnformatted).toBe('0.0001');
    });
  });

  it('returns unformatted fiat amount', async () => {
    const { result } = renderHookWithProvider(() => useTokenAmount(), {
      state: transferConfirmationState,
    });

    await waitFor(() => {
      expect(result.current.fiatUnformatted).toBe('0.359625');
    });
  });
});
