import { createStateFixture } from '../stateFixture';
import type { DeepPartial } from '../../renderWithProvider';
import type { RootState } from '../../../../reducers';

interface InitialStateAssetDetailsOptions {
  deterministicFiat?: boolean;
}

export const initialStateAssetDetails = (
  options?: InitialStateAssetDetailsOptions,
) => {
  const builder = createStateFixture()
    .withMinimalAccounts()
    .withMinimalMainnetNetwork()
    .withMinimalMultichainNetwork(true)
    .withMinimalKeyringController()
    .withMinimalTokenRates()
    .withMinimalMultichainAssetsRates()
    .withMinimalAnalyticsController()
    .withAccountTreeForSelectedAccount()
    .withRemoteFeatureFlags({})
    .withOverrides({
      engine: {
        backgroundState: {
          // Add Polygon alongside Mainnet (deepMerge preserves 0x1)
          NetworkController: {
            networkConfigurationsByChainId: {
              '0x89': {
                chainId: '0x89',
                rpcEndpoints: [
                  {
                    networkClientId: 'polygon-mainnet',
                    url: 'https://polygon-rpc.com',
                    type: 'custom',
                  },
                ],
                defaultRpcEndpointIndex: 0,
                blockExplorerUrls: ['https://polygonscan.com'],
                defaultBlockExplorerUrlIndex: 0,
                name: 'Polygon',
                nativeCurrency: 'POL',
              },
            },
            networksMetadata: {
              'polygon-mainnet': {
                status: 'available',
                EIPS: { 1559: true },
              },
            },
          },
          CurrencyRateController: {
            currentCurrency: 'USD',
            currencyRates: {
              ETH: { conversionRate: 2000 },
              POL: { conversionRate: 0.5 },
            },
          },
          PreferencesController: {
            isIpfsGatewayEnabled: false,
          },
          TokenBalancesController: { tokenBalances: {} },
          TokensController: {
            allTokens: {},
            allDetectedTokens: {},
            allIgnoredTokens: {},
          },
        },
      },
      settings: { primaryCurrency: 'ETH' },
    } as unknown as DeepPartial<RootState>);

  if (options?.deterministicFiat) {
    builder.withOverrides({
      engine: {
        backgroundState: {
          CurrencyRateController: {
            currentCurrency: 'USD',
            currencyRates: {
              ETH: { conversionRate: 2000 },
              POL: { conversionRate: 0.5 },
            },
          },
          TokenRatesController: { marketData: {} },
          MultichainAssetsRatesController: { conversionRates: {} },
        },
      },
    } as unknown as DeepPartial<RootState>);
  }

  return builder;
};
