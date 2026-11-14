import '../mocks';
import type { KycSessionStatus } from '@metamask/kyc-controller';
import Engine from '../../../app/core/Engine';
import ReduxService, { type ReduxStore } from '../../../app/core/redux';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { VBA_KYC_VENDOR } from '../../../app/components/UI/Ramp/Views/VirtualBankAccount/constants';
import MoneyHomeView from '../../../app/components/UI/Money/Views/MoneyHomeView';
import Routes from '../../../app/constants/navigation/Routes';
import VbaOnboardingNavigator from '../../../app/components/UI/Ramp/Views/VirtualBankAccount/VbaOnboardingNavigator';
import { renderScreenWithRoutes } from '../render';
import { initialStateVba } from '../presets/vba';

/** KYC `finalStatus` values the Money home card splits. */
export type MoneyHomeVbaKycFinalStatus = 'retry' | 'rejected';

/**
 * Stored UKYC session. `retryReasons` is not on {@link KycSessionStatus} yet;
 * a proof-of-address retry still arrives with `poa_resubmit`.
 */
type MoneyHomeKycSession = KycSessionStatus & {
  retryReasons?: readonly ['poa_resubmit'];
};

let restoreMoneyHomeStore: (() => void) | undefined;
let restoreMoneyHomeKycState: (() => void) | undefined;

/**
 * Puts back the `ReduxService.store` and the Engine `KycController.state` that
 * were in place before the last Money home render. Call from `afterEach` so
 * later suites on the same worker do not read this test's state.
 */
export function restoreMoneyHomeTestState(): void {
  restoreMoneyHomeStore?.();
  restoreMoneyHomeKycState?.();
  restoreMoneyHomeKycState = undefined;
}

const bindMoneyHomeStore = (store: ReduxStore): void => {
  restoreMoneyHomeStore?.();
  let previousStore: ReduxStore | undefined;
  try {
    previousStore = ReduxService.store;
  } catch {
    previousStore = undefined;
  }
  ReduxService.store = store;
  restoreMoneyHomeStore = (): void => {
    restoreMoneyHomeStore = undefined;
    if (previousStore) {
      ReduxService.store = previousStore;
    }
  };
};

const buildSession = (
  finalStatus: MoneyHomeVbaKycFinalStatus,
): MoneyHomeKycSession => ({
  id: 'session-1',
  externalUserId: 'user-1',
  vendor: VBA_KYC_VENDOR,
  vendorStatus: finalStatus,
  finalStatus,
  kycStatus: finalStatus,
  ...(finalStatus === 'retry'
    ? { retryReasons: ['poa_resubmit'] as const }
    : {}),
});

/**
 * Money home for an eligible VBA user whose stored KYC session has
 * `finalStatus`. The VBA onboarding navigator is registered so the card CTA
 * can reset onto it.
 *
 * @param finalStatus - Persisted KYC session outcome. `retry` also stores
 * `retryReasons: ['poa_resubmit']`.
 * @returns The rendered Money home screen and its store.
 */
export function renderMoneyHomeVbaCard(
  finalStatus: MoneyHomeVbaKycFinalStatus,
): ReturnType<typeof renderScreenWithRoutes> {
  const sessionStatus = buildSession(finalStatus);
  const state = initialStateVba()
    .withRemoteFeatureFlags({
      // Defaults on. Leaving it on subscribes to the accelerometer, which the
      // view-test sensor mock does not provide.
      earnMoneyCardTiltAnimationEnabled: {
        enabled: false,
        minimumVersion: '0.0.0',
      },
      earnMoneyCardFlipAnimationEnabled: {
        enabled: false,
        minimumVersion: '0.0.0',
      },
    })
    .withOverrides({
      engine: {
        backgroundState: {
          KycController: {
            sessionStatus,
            providerFlowStatus: 'submitted',
          },
          // Money home reads token balances for the card section. sortAssets
          // throws when PreferencesController.tokenSortConfig is missing.
          PreferencesController: {
            tokenSortConfig: {
              key: 'tokenFiatAmount',
              order: 'dsc',
              sortCallback: 'stringNumeric',
            },
          },
        },
      },
    } as unknown as DeepPartial<RootState>)
    .build();

  const kycController = Engine.context.KycController as unknown as {
    state: { sessionStatus: MoneyHomeKycSession };
  };
  restoreMoneyHomeKycState?.();
  const previousKycState = kycController.state;
  kycController.state = { sessionStatus };
  restoreMoneyHomeKycState = (): void => {
    kycController.state = previousKycState;
  };

  const view = renderScreenWithRoutes(
    MoneyHomeView,
    { name: Routes.MONEY.HOME },
    [
      {
        name: Routes.RAMP.VBA_ONBOARDING,
        Component: VbaOnboardingNavigator,
      },
    ],
    { state },
  );
  bindMoneyHomeStore(view.store);

  return view;
}
