import {
  DeepPartial,
  renderHookWithProvider,
} from '../../util/test/renderWithProvider';
import { backgroundState } from '../../util/test/initial-root-state';
import { RootState } from '../../reducers';
import { useGetFormattedTokensPerChain } from './useGetFormattedTokensPerChain';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { createMockAccountsControllerState } from '../../util/test/accountsControllerTestUtils';

const TEST_ADDRESS = '0x2990079bcdee240329a520d2444386fc119da21a';

const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  TEST_ADDRESS,
]);
const MOCK_ACCOUNT_ID =
  MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts.selectedAccount;

const USDC_ASSET_ID =
  'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const DAI_ASSET_ID =
  'eip155:1/erc20:0x6B175474E89094C44Da98b954EedeAC495271d0F';
const CAKE_ASSET_ID =
  'eip155:59144/erc20:0x0D1E753a25eBda689453309112904807625bEFBe';
const MAINNET_NATIVE_ASSET_ID = 'eip155:1/slip44:60';

const mockInitialState: DeepPartial<RootState> = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      AssetsController: {
        selectedCurrency: 'usd' as const,
        assetsInfo: {
          [MAINNET_NATIVE_ASSET_ID]: {
            type: 'native' as const,
            symbol: 'ETH',
            name: 'Ethereum',
            decimals: 18,
          },
          [USDC_ASSET_ID]: {
            type: 'erc20' as const,
            symbol: 'USDC',
            name: 'USD Coin',
            decimals: 6,
          },
          [DAI_ASSET_ID]: {
            type: 'erc20' as const,
            symbol: 'DAI',
            name: 'Dai Stablecoin',
            decimals: 18,
          },
          [CAKE_ASSET_ID]: {
            type: 'erc20' as const,
            symbol: 'CAKE',
            name: 'CAKE',
            decimals: 18,
            image:
              'https://static.cx.metamask.io/api/v1/tokenIcons/59144/0x0d1e753a25ebda689453309112904807625befbe.png',
          },
        },
        assetsBalance: {
          [MOCK_ACCOUNT_ID]: {
            // hex 0x2f18e6 @ 6 decimals
            [USDC_ASSET_ID]: { amount: '3.086566' },
            // hex 0x378afc9a77b47a30 @ 18 decimals
            [DAI_ASSET_ID]: { amount: '4.002288959235586608' },
            // hex 0x5d512b2498936 @ 18 decimals
            [CAKE_ASSET_ID]: { amount: '0.001641651160844598' },
          },
        },
        assetsPrice: {
          [MAINNET_NATIVE_ASSET_ID]: {
            assetPriceType: 'fungible' as const,
            price: 3596.25,
            usdPrice: 3596.25,
            lastUpdated: 1732887955694,
          },
          // Priced in fiat such that dividing by the ETH native rate (3596.25)
          // reproduces the native-denominated exchange rate of
          // 0.0002787306338815356 used by the pre-migration test fixture.
          [USDC_ASSET_ID]: {
            assetPriceType: 'fungible' as const,
            price: 0.0002787306338815356 * 3596.25,
            usdPrice: 0.0002787306338815356 * 3596.25,
            lastUpdated: 1732887955694,
          },
          [DAI_ASSET_ID]: {
            assetPriceType: 'fungible' as const,
            price: 0.0002787306338815356 * 3596.25,
            usdPrice: 0.0002787306338815356 * 3596.25,
            lastUpdated: 1732887955694,
          },
          // Reproduces the native-denominated exchange rate of
          // 0.0008492791541844991 for CAKE on Linea.
          [CAKE_ASSET_ID]: {
            assetPriceType: 'fungible' as const,
            price: 0.0008492791541844991 * 3596.25,
            usdPrice: 0.0008492791541844991 * 3596.25,
            lastUpdated: 1732887955694,
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
      address: TEST_ADDRESS,
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
        {
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          tokensWithBalances: [],
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
