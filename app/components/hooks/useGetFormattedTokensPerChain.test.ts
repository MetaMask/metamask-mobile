import {
  DeepPartial,
  renderHookWithProvider,
} from '../../util/test/renderWithProvider';
import { backgroundState } from '../../util/test/initial-root-state';
import { RootState } from '../../reducers';
import { useGetFormattedTokensPerChain } from './useGetFormattedTokensPerChain';
import { InternalAccount } from '@metamask/keyring-internal-api';

const mockInitialState: DeepPartial<RootState> = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      TokensController: {
        allTokens: {
          '0x1': {
            '0x2990079bcdee240329a520d2444386fc119da21a': [
              {
                address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                symbol: 'USDC',
                decimals: 6,
              },
              {
                address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
                symbol: 'DAI',
                decimals: 18,
              },
            ],
          },
          '0xe708': {
            '0x2990079bcdee240329a520d2444386fc119da21a': [
              {
                address: '0x0D1E753a25eBda689453309112904807625bEFBe',
                symbol: 'CAKE',
                decimals: 18,
                image:
                  'https://static.cx.metamask.io/api/v1/tokenIcons/59144/0x0d1e753a25ebda689453309112904807625befbe.png',
                aggregators: ['CoinGecko', 'Lifi', 'Rubic'],
              },
            ],
          },
        },
      },
      TokenBalancesController: {
        tokenBalances: {
          '0x2990079bcdee240329a520d2444386fc119da21a': {
            '0x1': {
              '0x6B175474E89094C44Da98b954EedeAC495271d0F':
                '0x378afc9a77b47a30', //ok
              '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': '0x2f18e6', //ok
            },
            '0xe708': {
              '0x0D1E753a25eBda689453309112904807625bEFBe': '0x5d512b2498936', //ok
            },
          },
        },
      },
      TokenRatesController: {
        marketData: {
          '0x1': {
            '0x0000000000000000000000000000000000000000': {
              allTimeHigh: 1.358362139899041,
              allTimeLow: 0.00012056394718021321,
              circulatingSupply: 120437986.49282,
              currency: 'ETH',
              dilutedMarketCap: 120403090.6888752,
              high1d: 1.0129617001531137,
              low1d: 0.9841725290871677,
              marketCap: 120403090.6888752,
              marketCapPercentChange1d: -0.50946,
              price: 0.9999691213549994,
            },
            '0x6B175474E89094C44Da98b954EedeAC495271d0F': {
              allTimeHigh: 0.00033971166167379965,
              allTimeLow: 0.0002455836861719872,
              circulatingSupply: 3515355095.30133,
              currency: 'ETH',
              dilutedMarketCap: 980322.1154301534,
              high1d: 0.0002792875382449353,
              low1d: 0.00027781396929937977,
              marketCap: 980322.1154301534,
              marketCapPercentChange1d: 0.72619,
              price: 0.0002787306338815356,
            },
            '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': {
              allTimeHigh: 0.00032578905258880787,
              allTimeLow: 0.0002443827219123158,
              circulatingSupply: 39426638449.1676,
              currency: 'ETH',
              dilutedMarketCap: 10994675.226936838,
              high1d: 0.0002792875382449353,
              low1d: 0.00027787606413589883,
              marketCap: 10993585.422458814,
              marketCapPercentChange1d: 0.02655,
              price: 0.0002787306338815356,
            },
          },
          '0xe708': {
            '0x0000000000000000000000000000000000000000': {
              allTimeHigh: 1.358362139899041,
              allTimeLow: 0.00012056394718021321,
              circulatingSupply: 120437986.49282,
              currency: 'ETH',
              dilutedMarketCap: 120403090.6888752,
              high1d: 1.0129617001531137,
              low1d: 0.9841725290871677,
              marketCap: 120403090.6888752,
              marketCapPercentChange1d: -0.50946,
              price: 0.9999691213549994,
            },
            '0x0D1E753a25eBda689453309112904807625bEFBe': {
              allTimeHigh: 0.012240757907524782,
              allTimeLow: 0.00005414252066189777,
              circulatingSupply: 285758585.383924,
              currency: 'ETH',
              dilutedMarketCap: 324034.19013549044,
              high1d: 0.0008659862850864894,
              low1d: 0.000824218457831514,
              marketCap: 242784.4478787338,
              marketCapPercentChange1d: -1.28481,
              price: 0.0008492791541844991,
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

describe('useGetFormattedTokensPerChain', () => {
  it('should return tokens formatted for each chain', async () => {
    const testChains = ['0x1', '0xe708'];
    const testAccount = {
      address: '0x2990079bcdee240329a520d2444386fc119da21a',
    };
    const expectedResult = {
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
      ],
    };

    const { result } = renderHookWithProvider(
      () =>
        useGetFormattedTokensPerChain(
          [testAccount as InternalAccount],
          false,
          testChains,
        ),
      {
        state: mockInitialState,
      },
    );

    // Note, we are currently only aggregating for popular networks
    expect(result.current).toEqual(expectedResult);
  });
});
