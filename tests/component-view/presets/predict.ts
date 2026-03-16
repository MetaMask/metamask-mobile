import { createStateFixture } from '../stateFixture';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';

/**
 * Default PredictController state for component view tests.
 * Selectors read from state.engine.backgroundState.PredictController.
 */
const defaultPredictControllerState = {
  balances: {},
  pendingDeposits: {},
  claimablePositions: {},
  accountMeta: {},
  withdrawTransaction: null,
};

/**
 * Returns a StateFixtureBuilder with minimal state for Predict views.
 * Use .withOverrides() to set PredictController fields, feature flags, etc.
 */
export const initialStatePredict = () =>
  createStateFixture()
    .withMinimalAccounts()
    .withMinimalMainnetNetwork()
    .withMinimalKeyringController()
    .withRemoteFeatureFlags({
      predictTradingEnabled: {
        enabled: true,
        featureVersion: '1.0.0',
        minimumVersion: '0.0.1',
      },
    })
    .withOverrides({
      engine: {
        backgroundState: {
          PredictController: defaultPredictControllerState,
          NetworkController: {
            selectedNetworkClientId: 'mainnet',
          },
          PreferencesController: {
            privacyMode: false,
            selectedAddress: '0x1234567890abcdef',
          },
          // usePredictDeposit -> useConfirmNavigation reads TransactionController
          TransactionController: {
            transactions: [],
            transactionBatches: [],
          },
        },
      },
    } as unknown as DeepPartial<RootState>);
