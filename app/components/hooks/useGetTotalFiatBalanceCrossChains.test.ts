import {
  DeepPartial,
  renderHookWithProvider,
} from '../../util/test/renderWithProvider';
import { backgroundState } from '../../util/test/initial-root-state';
import { RootState } from '../../reducers';
import { useGetTotalFiatBalanceCrossChains } from './useGetTotalFiatBalanceCrossChains';
import { InternalAccount } from '@metamask/keyring-internal-api';

const mockInitialState: DeepPartial<RootState> = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountTrackerController: {
        accountsByChainId: {
          '0x1': {
            '0x2990079bcdEe240329a520d2444386FC119da21a': {
              balance: '0x514709b083007',
            },
          },
          '0xe708': {
            '0x2990079bcdEe240329a520d2444386FC119da21a': {
              balance: '0x445ad0c72ea74',
            },
          },
        },
      },
      CurrencyRateController: {
        currentCurrency: 'usd',
        currencyRates: {
          ETH: {
            conversionDate: 1732887955.694,
            conversionRate: 3596.25,
            usdConversionRate: 3596.25,
          },
          LineaETH: {
            conversionDate: 1732887955.694,
            conversionRate: 3596.25,
            usdConversionRate: 3596.25,
          },
        },
      },
    },
  },
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useSelector: (fn: any) => fn(mockInitialState),
}));

describe('useGetTotalFiatBalanceCrossChains', () => {
  it('should return cross chain fiat balance aggregated successfully', async () => {
    const testAccount = {
      address: '0x2990079bcdee240329a520d2444386fc119da21a',
    };
    const testFormattedTokens = {
      [testAccount.address]: [
        {
          chainId: '0x1',
          tokensWithBalances: [
            {
              address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
              symbol: 'USDC',
              decimals: 6,
              balance: '3.08657',
              tokenBalanceFiat: 3.09,
            },
            {
              address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
              symbol: 'DAI',
              decimals: 18,
              balance: '4.00229',
              tokenBalanceFiat: 4.01,
            },
          ],
        },
        {
          chainId: '0xe708',
          tokensWithBalances: [
            {
              address: '0x0D1E753a25eBda689453309112904807625bEFBe',
              symbol: 'CAKE',
              decimals: 18,
              balance: '0.00164',
              tokenBalanceFiat: 0,
            },
          ],
        },
      ],
    };

    const expectedResult = {
      [testAccount.address]: {
        totalFiatBalance: 16.56,
        totalTokenFiat: 7.1,
        tokenFiatBalancesCrossChains: [
          {
            chainId: '0x1',
            tokensWithBalances: [
              {
                address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                symbol: 'USDC',
                decimals: 6,
                balance: '3.08657',
                tokenBalanceFiat: 3.09,
              },
              {
                address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
                symbol: 'DAI',
                decimals: 18,
                balance: '4.00229',
                tokenBalanceFiat: 4.01,
              },
            ],
            tokenFiatBalances: [3.09, 4.01],
            nativeFiatValue: 5.14,
          },
          {
            chainId: '0xe708',
            tokensWithBalances: [
              {
                address: '0x0D1E753a25eBda689453309112904807625bEFBe',
                symbol: 'CAKE',
                decimals: 18,
                balance: '0.00164',
                tokenBalanceFiat: 0,
              },
            ],
            tokenFiatBalances: [0],
            nativeFiatValue: 4.32,
          },
        ],
      },
    };
    const { result } = renderHookWithProvider(
      () =>
        useGetTotalFiatBalanceCrossChains(
          [testAccount as InternalAccount],
          testFormattedTokens,
        ),
      {
        state: mockInitialState,
      },
    );
    expect(result.current).toEqual(expectedResult);
  });
});
