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
export type MoneyHomeVbaKycFinalStatus = 'retry' | 'rejected' | 'approved';

export interface RenderMoneyHomeVbaCardOptions {
  /**
   * MoonPay customer abilities already in `RampsController` state. Leave it
   * out to start with none loaded, as after an app restart.
   */
  vbaCustomerAbilities?: unknown;
}

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
 * Puts back the Engine `KycController.state` from before the last Money home
 * render, and the previous `ReduxService.store` when one already existed.
 *
 * When no store existed before the render, the last test store stays.
 * `ReduxService` cannot clear a store.
 *
 * Registered automatically below, including when a test throws. Safe to call
 * again: a second call is a no-op.
 */
export function restoreMoneyHomeTestState(): void {
  restoreMoneyHomeStore?.();
  restoreMoneyHomeKycState?.();
  restoreMoneyHomeKycState = undefined;
}

// Jest evaluates this module once per test file. Registering here covers every
// spec that imports the renderer, so a caller cannot forget the restore.
afterEach(() => {
  restoreMoneyHomeTestState();
});

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
    // When no store existed, the last test store stays. ReduxService
    // cannot clear a store.
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
 * @param options - Extra controller state for the render.
 * @returns The rendered Money home screen and its store.
 */
export function renderMoneyHomeVbaCard(
  finalStatus: MoneyHomeVbaKycFinalStatus,
  options: RenderMoneyHomeVbaCardOptions = {},
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
          RampsController: {
            vbaCustomerAbilities: options.vbaCustomerAbilities ?? null,
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
    state?: { sessionStatus: MoneyHomeKycSession };
  };
  restoreMoneyHomeKycState?.();
  const previousKycState = kycController.state;
  kycController.state = { sessionStatus };
  restoreMoneyHomeKycState = (): void => {
    if (previousKycState === undefined) {
      delete kycController.state;
      return;
    }
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
