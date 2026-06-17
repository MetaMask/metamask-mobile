import '../../../../tests/component-view/mocks';
import { renderComponentViewScreen } from '../../../../tests/component-view/render';
import { initialStateNetworkManager } from '../../../../tests/component-view/presets/networkManager';
import { describeForPlatforms } from '../../../../tests/component-view/platform';
import { waitFor } from '@testing-library/react-native';
import React from 'react';
import Tokens from './index';
import type { DeepPartial } from '../../../util/test/renderWithProvider';
import type { RootState } from '../../../reducers';

const DEFAULT_ADDRESS = '0x0000000000000000000000000000000000000001';
const USDC_ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';

/**
 * Builds state with tokens on Ethereum (ETH native + USDC ERC20)
 * and Polygon (POL native) using the legacy controller path.
 */
function buildTokenFilterState(options: {
  enabledNetworks: Record<string, Record<string, boolean>>;
  activeEvmChainId: string;
}) {
  return initialStateNetworkManager({
    enabledNetworks: options.enabledNetworks,
    activeEvmChainId: options.activeEvmChainId,
    includeCustomNetworks: true,
  })
    .withMinimalGasFee()
    .withMinimalTransactionController()
    .withMinimalSmartTransactions()
    .withOverrides({
      engine: {
        backgroundState: {
          AccountTrackerController: {
            accountsByChainId: {
              '0x1': {
                [DEFAULT_ADDRESS]: {
                  address: DEFAULT_ADDRESS,
                  balance: '0x8AC7230489E80000', // 10 ETH
                },
              },
              '0x89': {
                [DEFAULT_ADDRESS]: {
                  address: DEFAULT_ADDRESS,
                  balance: '0x8AC7230489E80000', // 10 POL
                },
              },
            },
          },
          TokensController: {
            allTokens: {
              '0x1': {
                [DEFAULT_ADDRESS]: [
                  {
                    address: USDC_ADDRESS,
                    symbol: 'USDC',
                    name: 'USD Coin',
                    decimals: 6,
                    image: '',
                  },
                ],
              },
              '0x89': {
                [DEFAULT_ADDRESS]: [],
              },
            },
            allDetectedTokens: {},
            allIgnoredTokens: {},
          },
          TokenBalancesController: {
            tokenBalances: {
              [DEFAULT_ADDRESS]: {
                '0x1': {
                  [USDC_ADDRESS]: '0x2540BE400', // 10000 USDC
                },
              },
            },
          },
          TokenRatesController: {
            marketData: {
              '0x1': {
                [USDC_ADDRESS]: {
                  tokenAddress: USDC_ADDRESS,
                  currency: 'ETH',
                  price: 0.0005,
                },
              },
            },
          },
          CurrencyRateController: {
            currentCurrency: 'USD',
            currencyRates: {
              ETH: { conversionRate: 2000, usdConversionRate: 2000 },
              POL: { conversionRate: 0.5, usdConversionRate: 0.5 },
            },
          },
          MultichainAssetsController: {
            accountsAssets: {},
            assetsMetadata: {},
            allIgnoredAssets: {},
          },
          MultichainBalancesController: {
            balances: {},
          },
          MultichainAssetsRatesController: {
            conversionRates: {},
          },
          MultichainTransactionsController: {
            nonEvmTransactions: {},
          },
          NftController: {
            allNfts: {},
            allNftContracts: {},
          },
          AssetsController: {
            assets: {},
            assetsBalance: {},
            assetsInfo: {},
            assetsPrice: {},
            customAssets: {},
            assetPreferences: {},
          },
          TransactionPayController: {
            transactionData: {},
          },
          ApprovalController: {
            pendingApprovals: {},
            pendingApprovalCount: 0,
          },
          EarnController: {
            lastUpdated: 0,
            pooled_staking: {
              isEligible: false,
            },
            lending: {
              positions: [],
              markets: [],
            },
          },
        },
      },
      settings: {
        hideZeroBalanceTokens: false,
      },
    } as unknown as DeepPartial<RootState>)
    .build();
}

const TokensWrapper = () => <Tokens isFullView />;

describeForPlatforms('Tokens — network filtering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // E2E test 8: "should filter tokens by selected network from list of enabled popular networks"
  // Proves: when only Ethereum is enabled, ETH is visible and Polygon tokens are not.
  // The full selector chain filters by NetworkEnablementController.enabledNetworkMap.
  it('shows ETH when Ethereum is enabled and hides Polygon tokens', async () => {
    const state = buildTokenFilterState({
      enabledNetworks: { eip155: { '0x1': true } },
      activeEvmChainId: '0x1',
    });

    const { findByTestId, queryByTestId } = renderComponentViewScreen(
      TokensWrapper,
      { name: 'TokensTest' },
      { state },
    );

    // ETH native token should be visible (filtered to Ethereum)
    const ethToken = await findByTestId('asset-ETH', undefined, {
      timeout: 10000,
    });
    expect(ethToken).toBeOnTheScreen();

    // Polygon native token should NOT be visible
    await waitFor(() => {
      expect(queryByTestId('asset-POL')).not.toBeOnTheScreen();
    });
  });

  // E2E test 9: "should filter tokens by custom enabled networks"
  // Proves: when Sepolia (custom testnet) is enabled, mainnet tokens are NOT visible.
  it('hides mainnet tokens when custom network (Sepolia) is enabled', async () => {
    const state = buildTokenFilterState({
      enabledNetworks: { eip155: { '0xaa36a7': true } },
      activeEvmChainId: '0xaa36a7',
    });

    const { queryByTestId } = renderComponentViewScreen(
      TokensWrapper,
      { name: 'TokensTest' },
      { state },
    );

    // Mainnet tokens should NOT be visible when filtered to Sepolia
    await waitFor(
      () => {
        expect(queryByTestId('asset-ETH')).not.toBeOnTheScreen();
        expect(queryByTestId('asset-USDC')).not.toBeOnTheScreen();
      },
      { timeout: 5000 },
    );
  });

  // E2E test 7: "should filter tokens by Solana" (adapted — proves USDC also appears on Ethereum)
  // Proves: both native ETH and ERC20 USDC render when Ethereum is the enabled network.
  it('shows both ETH and USDC when Ethereum is enabled', async () => {
    const state = buildTokenFilterState({
      enabledNetworks: { eip155: { '0x1': true } },
      activeEvmChainId: '0x1',
    });

    const { findByTestId } = renderComponentViewScreen(
      TokensWrapper,
      { name: 'TokensTest' },
      { state },
    );

    const ethToken = await findByTestId('asset-ETH', undefined, {
      timeout: 10000,
    });
    expect(ethToken).toBeOnTheScreen();

    const usdcToken = await findByTestId('asset-USDC', undefined, {
      timeout: 5000,
    });
    expect(usdcToken).toBeOnTheScreen();
  });
});
