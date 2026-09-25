import '../../../../../../../tests/component-view/mocks';
import React from 'react';
import { within } from '@testing-library/react-native';

import { describeForPlatforms } from '../../../../../../../tests/component-view/platform';
import { renderScreenWithRoutes } from '../../../../../../../tests/component-view/render';
import { initialStateWallet } from '../../../../../../../tests/component-view/presets/wallet';
import { sendViewOverrides } from '../../../../../../../tests/component-view/presets/send';
import type { DeepPartial } from '../../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../../reducers';
import Routes from '../../../../../../constants/navigation/Routes';
import { getAssetTestId } from '../../../../../UI/AssetElement/AssetElement.testIds';
import { Send } from '../send';

const ACCOUNT = '0x0000000000000000000000000000000000000001';
const ACCOUNT_ID = 'acc-1';
const NATIVE_ADDRESS = '0x0000000000000000000000000000000000000000';
const MAINNET_CHAIN_ID = '0x1';
const SEPOLIA_CHAIN_ID = '0xaa36a7';
const MAINNET_NATIVE_ASSET_ID = 'eip155:1/slip44:60';
const SEPOLIA_NATIVE_ASSET_ID = 'eip155:11155111/slip44:60';

const nativeAssetInfo = (symbol: string, name: string) => ({
  type: 'native',
  symbol,
  name,
  decimals: 18,
});

const nativeAssetPrice = (id: string, price: number) => ({
  assetPriceType: 'fungible',
  id,
  price,
  usdPrice: price,
  lastUpdated: 1700000000000,
});

/**
 * Seeds one mainnet and one Sepolia native asset, each with a known conversion
 * rate, so the picker has a testnet row to hide fiat on and a mainnet row that
 * must keep showing it.
 */
const buildSepoliaFiatOverrides = (showFiatOnTestnets: boolean) =>
  ({
    settings: { showFiatOnTestnets },
    engine: {
      backgroundState: {
        NetworkController: {
          networkConfigurationsByChainId: {
            [SEPOLIA_CHAIN_ID]: {
              chainId: SEPOLIA_CHAIN_ID,
              rpcEndpoints: [
                {
                  networkClientId: 'sepolia',
                  url: 'https://sepolia.infura.io/v3/{infuraProjectId}',
                  type: 'infura',
                  name: 'Sepolia default RPC',
                },
              ],
              defaultRpcEndpointIndex: 0,
              blockExplorerUrls: [],
              name: 'Sepolia',
              nativeCurrency: 'SepoliaETH',
            },
          },
        },
        CurrencyRateController: {
          currentCurrency: 'USD',
          currencyRates: {
            ETH: { conversionRate: 2000 },
            SepoliaETH: { conversionRate: 1000 },
          },
        },
        AssetsController: {
          selectedCurrency: 'usd',
          assetsBalance: {
            [ACCOUNT_ID]: {
              [MAINNET_NATIVE_ASSET_ID]: { amount: '1' },
              [SEPOLIA_NATIVE_ASSET_ID]: { amount: '1' },
            },
          },
          assetsInfo: {
            [MAINNET_NATIVE_ASSET_ID]: nativeAssetInfo('ETH', 'Ethereum'),
            [SEPOLIA_NATIVE_ASSET_ID]: nativeAssetInfo(
              'SepoliaETH',
              'Sepolia Ether',
            ),
          },
          assetsPrice: {
            [MAINNET_NATIVE_ASSET_ID]: nativeAssetPrice('eth', 2000),
            [SEPOLIA_NATIVE_ASSET_ID]: nativeAssetPrice('sepolia-eth', 1000),
          },
        },
        TokensController: {
          allTokens: {
            [MAINNET_CHAIN_ID]: { [ACCOUNT]: [] },
            [SEPOLIA_CHAIN_ID]: { [ACCOUNT]: [] },
          },
          allIgnoredTokens: {},
        },
        TokenRatesController: {
          marketData: {
            [MAINNET_CHAIN_ID]: {
              [NATIVE_ADDRESS]: {
                tokenAddress: NATIVE_ADDRESS,
                currency: 'ETH',
                price: 1,
              },
            },
            [SEPOLIA_CHAIN_ID]: {
              [NATIVE_ADDRESS]: {
                tokenAddress: NATIVE_ADDRESS,
                currency: 'SepoliaETH',
                price: 1,
              },
            },
          },
        },
      },
    },
  }) as unknown as DeepPartial<RootState>;

const renderAssetPicker = (showFiatOnTestnets: boolean) => {
  const state = initialStateWallet()
    .withOverrides(sendViewOverrides)
    .withOverrides(buildSepoliaFiatOverrides(showFiatOnTestnets))
    .build();

  return renderScreenWithRoutes(
    Send as unknown as React.ComponentType,
    { name: Routes.SEND.DEFAULT },
    [],
    { state },
    { screen: Routes.SEND.ASSET },
  );
};

describeForPlatforms('Send asset picker — testnet fiat preference', () => {
  /**
   * Regression for incident 1751 (#32684): the asset picker showed a Sepolia
   * fiat value even with "Show conversion on test networks" disabled.
   */
  it('hides Sepolia fiat but keeps mainnet fiat when the setting is disabled', async () => {
    const { findByTestId } = renderAssetPicker(false);

    const sepoliaRow = await findByTestId(
      getAssetTestId('SepoliaETH'),
      {},
      { timeout: 5000 },
    );
    const mainnetRow = await findByTestId(
      getAssetTestId('ETH'),
      {},
      { timeout: 5000 },
    );

    expect(within(sepoliaRow).queryByText('$1,000')).toBeNull();
    expect(within(mainnetRow).getByText('$2,000')).toBeOnTheScreen();
  });

  it('shows Sepolia fiat when the setting is enabled', async () => {
    const { findByTestId } = renderAssetPicker(true);

    const sepoliaRow = await findByTestId(
      getAssetTestId('SepoliaETH'),
      {},
      { timeout: 5000 },
    );

    expect(within(sepoliaRow).getByText('$1,000')).toBeOnTheScreen();
  });
});
