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
import { MoneyModalStack } from '../../../app/components/UI/Money/routes';
import { IS_MONEY_MFA_ENABLED_FLAG_NAME } from '../../../app/lib/Money/feature-flags';
import { FeatureFlagNames } from '../../../app/constants/featureFlags';
import { MoneyAccountBalanceServiceQueryKeys } from '../../../app/components/UI/Money/queryKeys';

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
let restoreMoneyHomeEngineCall: (() => void) | undefined;

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
  restoreMoneyHomeEngineCall?.();
  restoreMoneyHomeEngineCall = undefined;
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

const ENABLED_FLAG = { enabled: true, minimumVersion: '0.0.0' };

// 25 mUSD, so Transfer is enabled.
const MONEY_HOME_BALANCE = {
  totalBalance: '25000000',
  vmusdValueInMusd: '25000000',
  musdBalance: '0',
  source: 'api',
  usedFallback: false,
};

const buildMoneyHomeState = (
  backgroundState: Record<string, unknown> = {},
  remoteFeatureFlags: Record<string, unknown> = {},
) =>
  initialStateVba()
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
      ...remoteFeatureFlags,
    })
    .withOverrides({
      engine: {
        backgroundState: {
          ...backgroundState,
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
  const state = buildMoneyHomeState({
    KycController: {
      sessionStatus,
      providerFlowStatus: 'submitted',
    },
  });

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

/** Money home with 2-step verification available and the Money modal stack registered. */
export function renderMoneyHomeMfa(): ReturnType<
  typeof renderScreenWithRoutes
> {
  const state = buildMoneyHomeState(
    {},
    {
      [IS_MONEY_MFA_ENABLED_FLAG_NAME]: ENABLED_FLAG,
      [FeatureFlagNames.mfaUiKit]: ENABLED_FLAG,
    },
  );
  const engineCall = jest.spyOn(
    Engine.controllerMessenger,
    'call',
  ) as unknown as jest.Mock;
  const baseEngineCall = engineCall.getMockImplementation();
  restoreMoneyHomeEngineCall?.();
  restoreMoneyHomeEngineCall = () => {
    if (baseEngineCall) {
      engineCall.mockImplementation(baseEngineCall);
    }
  };
  engineCall.mockImplementation((action: string, ...args: unknown[]) => {
    if (
      action === MoneyAccountBalanceServiceQueryKeys.FETCH_BALANCE_WITH_FALLBACK
    ) {
      return Promise.resolve(MONEY_HOME_BALANCE);
    }
    return baseEngineCall?.(action, ...args);
  });

  const view = renderScreenWithRoutes(
    MoneyHomeView,
    { name: Routes.MONEY.HOME },
    [
      { name: Routes.MONEY.MFA_INTRO },
      { name: Routes.MONEY.MODALS.ROOT, Component: MoneyModalStack },
    ],
    { state },
  );
  bindMoneyHomeStore(view.store);
  return view;
}
