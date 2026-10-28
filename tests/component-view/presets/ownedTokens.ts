import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { createStateFixture } from '../stateFixture';
import { initialStateWallet } from './wallet';
import { HIDDEN_OWNED_ASSET_ID } from '../api-mocking/owned-tokens';

interface OwnedTokensStateOptions {
  flagEnabled?: boolean;
  privacyMode?: boolean;
}

export const initialStateOwnedTokens = ({
  flagEnabled = true,
  privacyMode = false,
}: OwnedTokensStateOptions = {}) =>
  initialStateWallet()
    .withRemoteFeatureFlags({
      ownedTokensImportEnabled: {
        enabled: flagEnabled,
        minimumVersion: '0.0.0',
      },
    })
    .withOverrides({
      settings: {
        basicFunctionalityEnabled: true,
      },
      engine: {
        backgroundState: {
          NetworkEnablementController: {
            enabledNetworkMap: {
              eip155: { '0x1': true },
            },
          },
          PreferencesController: {
            privacyMode,
          },
          CurrencyRateController: {
            currentCurrency: 'usd',
            currencyRates: {
              ETH: {
                conversionRate: 1,
                usdConversionRate: 1,
              },
            },
          },
          AssetsController: {
            selectedCurrency: 'usd',
            assetsInfo: {},
            assetsBalance: {},
            customAssets: {},
            assetPreferences: {
              [HIDDEN_OWNED_ASSET_ID]: { hidden: true },
            },
          },
        },
      },
    } as unknown as DeepPartial<RootState>);

/** Flag-off TokenView still needs a wallet, without the import flag. */
export const initialStateFindTokensOnly = () =>
  createStateFixture()
    .withMinimalAccounts()
    .withMinimalMainnetNetwork()
    .withAccountTreeForSelectedAccount()
    .withRemoteFeatureFlags({})
    .withMinimalAnalyticsController();
