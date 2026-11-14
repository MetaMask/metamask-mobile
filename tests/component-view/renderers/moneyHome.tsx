import '../mocks';
import Engine from '../../../app/core/Engine';
import ReduxService, { type ReduxStore } from '../../../app/core/redux';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import MoneyHomeView from '../../../app/components/UI/Money/Views/MoneyHomeView';
import Routes from '../../../app/constants/navigation/Routes';
import VbaOnboardingNavigator from '../../../app/components/UI/Ramp/Views/VirtualBankAccount/VbaOnboardingNavigator';
import { renderScreenWithRoutes } from '../render';
import { initialStateVba } from '../presets/vba';

/** KYC `finalStatus` values the Money home card splits. */
export type MoneyHomeVbaKycFinalStatus = 'retry' | 'rejected';

interface KycSessionFixture {
  id: string;
  externalUserId: string;
  vendor: string;
  vendorStatus: string;
  finalStatus: MoneyHomeVbaKycFinalStatus;
  kycStatus: MoneyHomeVbaKycFinalStatus;
}

let restoreMoneyHomeStore: (() => void) | undefined;

/**
 * Puts back the `ReduxService.store` that was current before the last Money
 * home render. Call from `afterEach` so later suites on the same worker do
 * not read this test's store.
 */
export function restoreMoneyHomeReduxServiceStore(): void {
  restoreMoneyHomeStore?.();
}

const bindMoneyHomeStore = (store: ReduxStore): void => {
  restoreMoneyHomeReduxServiceStore();
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
): KycSessionFixture => ({
  id: 'session-1',
  externalUserId: 'user-1',
  vendor: 'sumsub',
  vendorStatus: finalStatus,
  finalStatus,
  kycStatus: finalStatus,
});

/**
 * Money home for an eligible VBA user whose stored KYC session has
 * `finalStatus`. The VBA onboarding navigator is registered so the card CTA
 * can reset onto it.
 *
 * @param finalStatus - Persisted KYC session outcome.
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

  (
    Engine.context.KycController as unknown as {
      state: { sessionStatus: KycSessionFixture };
    }
  ).state = { sessionStatus };

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
