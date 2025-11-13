import { createStateFixture } from '../stateFixture';
import { initialState as BridgeMocksInitial } from '../../../../components/UI/Bridge/_mocks_/initialState';
import type { DeepPartial } from '../../renderWithProvider';
import type { RootState } from '../../../../reducers';

interface InitialStateBridgeOptions {
  deterministicFiat?: boolean;
}

/**
 * Returns a pre-configured StateFixtureBuilder tailored for Bridge views.
 * It sets the minimal required background controllers and app slices
 * to make Bridge screens render and operate without extra mocks.
 *
 * Use chainable calls on the returned builder to customize per-test needs.
 */
export const initialStateBridge = (options?: InitialStateBridgeOptions) => {
  const builder = createStateFixture({ base: 'empty' })
    .withMinimalBridgeController()
    .withMinimalAccounts()
    .withMinimalMainnetNetwork()
    .withMinimalMultichainNetwork(true)
    .withMinimalSmartTransactions()
    .withPreferences({
      smartTransactionsOptInStatus: false,
      useTokenDetection: false,
      tokenNetworkFilter: { '0x1': true },
    } as unknown as Record<string, unknown>)
    .withMinimalGasFee()
    .withMinimalTransactionController()
    .withMinimalKeyringController()
    .withMinimalTokenRates()
    .withMinimalMultichainAssetsRates()
    .withAccountTreeForSelectedAccount()
    .withRemoteFeatureFlags({});

  if (options?.deterministicFiat) {
    const bridgeBg = (
      BridgeMocksInitial.engine as unknown as {
        backgroundState: Record<string, unknown>;
      }
    ).backgroundState;
    builder.withOverrides({
      engine: {
        backgroundState: {
          CurrencyRateController: bridgeBg.CurrencyRateController,
          TokenRatesController: bridgeBg.TokenRatesController,
          MultichainAssetsRatesController:
            bridgeBg.MultichainAssetsRatesController,
        },
      },
    } as unknown as DeepPartial<RootState>);
  }

  return builder;
};
