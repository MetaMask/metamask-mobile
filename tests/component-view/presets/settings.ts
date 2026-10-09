import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { createStateFixture } from '../stateFixture';

const SETTINGS_ACCOUNT = '0x0000000000000000000000000000000000000001';

export const initialStateSettings = () =>
  createStateFixture()
    .withMinimalAccounts(SETTINGS_ACCOUNT)
    .withMinimalMainnetNetwork()
    .withMinimalMultichainNetwork(true)
    .withMinimalKeyringController()
    .withRemoteFeatureFlags({})
    .withOverrides({
      settings: {
        basicFunctionalityEnabled: true,
        searchEngine: 'Google',
        primaryCurrency: 'ETH',
        avatarAccountType: 'Maskicon',
        hideZeroBalanceTokens: false,
        hapticsEnabled: true,
        showHexData: true,
        showFiatOnTestnets: false,
      },
      engine: {
        backgroundState: {
          CurrencyRateController: {
            currentCurrency: 'usd',
            currencyRates: {},
          },
          NotificationServicesController: {
            isNotificationServicesEnabled: false,
          },
          PreferencesController: {
            dismissSmartAccountSuggestionEnabled: false,
            smartTransactionsOptInStatus: true,
            useTokenDetection: true,
          },
        },
      },
    } as unknown as DeepPartial<RootState>);
