import { MOCK_GET_POOLED_STAKES_API_RESPONSE, MOCK_GET_POOLED_STAKES_API_RESPONSE_HIGH_ASSETS_AMOUNT } from '../__mocks__/mockData';
import { createMockAccountsControllerState } from '../../../../util/test/accountsControllerTestUtils';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import useBalance from './useBalance';
import { toHex } from '@metamask/controller-utils';
import usePooledStakes from './usePooledStakes';
import { PooledStake } from '@metamask/stake-sdk';

const MOCK_ADDRESS_1 = '0x0';

const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  MOCK_ADDRESS_1,
]);

const initialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      AccountTrackerController: {
        accountsByChainId: {
          '0x1': {
            [MOCK_ADDRESS_1]: { balance: toHex('12345678909876543210000000') },
          },
        },
      },
      CurrencyRateController: {
        currentCurrency: 'usd',
        currencyRates: {
          ETH: {
            conversionRate: 3200,
          },
        },
      },
    },
  },
};

jest.mock('../hooks/usePooledStakes');
const mockUsePooledStakes = (pooledStake: PooledStake, exchangeRate: string) => {
  (usePooledStakes as jest.MockedFn<typeof usePooledStakes>).mockReturnValue({
    pooledStakesData: pooledStake,
    exchangeRate,
    isLoadingPooledStakesData: false,
    error: null,
    refreshPooledStakes: jest.fn(),
    hasStakedPositions: true,
    hasEthToUnstake: true,
    hasNeverStaked: false,
    hasRewards: true,
    hasRewardsOnly: false,
  });
};

describe('useBalance', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  it('returns balance and fiat values based on account and pooled stake data', async () => {
    mockUsePooledStakes(MOCK_GET_POOLED_STAKES_API_RESPONSE.accounts[0], MOCK_GET_POOLED_STAKES_API_RESPONSE.exchangeRate);
    const { result } = renderHookWithProvider(() => useBalance(), {
      state: initialState,
    });


    expect(result.current.balance).toBe('12345678.90988'); // ETH balance
    expect(result.current.balanceWei.toString()).toBe(
      '12345678909876543210000000',
    ); // Wei balance
    expect(result.current.balanceFiat).toBe('$39506172511.60'); // Fiat balance
    expect(result.current.balanceFiatNumber).toBe(39506172511.6); // Fiat number balance
    expect(result.current.stakedBalanceWei).toBe('5791332670714232000'); // No staked assets
    expect(result.current.formattedStakedBalanceETH).toBe('5.79133 ETH'); // Formatted ETH balance
    expect(result.current.stakedBalanceFiatNumber).toBe(18532.26454); // Staked balance in fiat number
    expect(result.current.formattedStakedBalanceFiat).toBe('$18532.26'); //
  });

  it('returns default values when no selected address and no account data', async () => {
    mockUsePooledStakes(MOCK_GET_POOLED_STAKES_API_RESPONSE.accounts[0], MOCK_GET_POOLED_STAKES_API_RESPONSE.exchangeRate);
    const { result } = renderHookWithProvider(() => useBalance(), {
      state: {
        ...initialState,
        engine: {
          backgroundState: {
            ...backgroundState,
            AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
            CurrencyRateController: {
              currentCurrency: 'usd',
              currencyRates: {
                ETH: {
                  conversionRate: 3200,
                },
              },
            },
          },
        },
      },
    });

    expect(result.current.balance).toBe('0'); // ETH balance
    expect(result.current.balanceWei.toString()).toBe('0'); // Wei balance
    expect(result.current.balanceFiat).toBe('$0.00'); // Fiat balance
    expect(result.current.balanceFiatNumber).toBe(0); // Fiat number balance
  });

  it('returns correct stake amounts and fiat values based on account with high amount of assets', async () => {
    mockUsePooledStakes(MOCK_GET_POOLED_STAKES_API_RESPONSE_HIGH_ASSETS_AMOUNT.accounts[0], MOCK_GET_POOLED_STAKES_API_RESPONSE_HIGH_ASSETS_AMOUNT.exchangeRate);
    const { result } = renderHookWithProvider(() => useBalance(), {
      state: initialState,
    });

    expect(result.current.balance).toBe('12345678.90988'); // ETH balance
    expect(result.current.balanceWei.toString()).toBe(
      '12345678909876543210000000',
    );
    expect(result.current.balanceFiat).toBe('$39506172511.60'); // Fiat balance
    expect(result.current.balanceFiatNumber).toBe(39506172511.6); // Fiat number balance

    expect(result.current.stakedBalanceWei).toBe('99999999990000000000000'); // No staked assets
    expect(result.current.formattedStakedBalanceETH).toBe('99999.99999 ETH'); // Formatted ETH balance
    expect(result.current.stakedBalanceFiatNumber).toBe(319999999.968); // Staked balance in fiat number
    expect(result.current.formattedStakedBalanceFiat).toBe('$319999999.97'); //
  });
});
