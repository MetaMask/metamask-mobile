import '../mocks';
import React from 'react';
import { Pressable, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { ToastContext } from '../../../app/component-library/components/Toast/Toast.context';
import type { ToastRef } from '../../../app/component-library/components/Toast/Toast.types';
import Engine from '../../../app/core/Engine';
import type { AppNavigationProp } from '../../../app/core/NavigationService/types';
import EarningsTab from '../../../app/components/UI/Rewards/components/Money/Tabs/EarningsTab';
import TaxFormQuestionSheet from '../../../app/components/UI/Rewards/components/Money/TaxFormQuestionSheet';
import TaxFormOpenFormSheet from '../../../app/components/UI/Rewards/components/Money/TaxFormOpenFormSheet';
import TaxFormContactUsSheet from '../../../app/components/UI/Rewards/components/Money/TaxFormContactUsSheet';
import RewardsInfoSheetModal from '../../../app/components/UI/Rewards/components/RewardsInfoSheetModal';
import PerformanceTab from '../../../app/components/UI/Rewards/components/Money/Tabs/PerformanceTab';
import AcceptInviteSheet from '../../../app/components/UI/Rewards/components/Money/AcceptInviteSheet';
import RewardsMoneyDashboard from '../../../app/components/UI/Rewards/Views/RewardsMoneyDashboard';
import RewardsDashboard from '../../../app/components/UI/Rewards/Views/RewardsDashboard';
import ReduxService from '../../../app/core/redux/ReduxService';
import type { ReduxStore } from '../../../app/core/redux/types';
import RewardsSettingsView from '../../../app/components/UI/Rewards/Views/RewardsSettingsView';
import RewardsEarningsHistoryView from '../../../app/components/UI/Rewards/Views/RewardsEarningsHistoryView';
import RewardsMoneyReferralAcceptedSplashView from '../../../app/components/UI/Rewards/Views/RewardsMoneyReferralAcceptedSplashView';
import type { MoneyReferralEntryType } from '../../../app/components/UI/Rewards/types/navigation';
import RewardsTaxFormView from '../../../app/components/UI/Rewards/Views/RewardsTaxFormView';
import { RewardsMoneyClaimRefusalError } from '../../../app/core/Engine/controllers/rewards-money-controller/services/rewards-money-data-service';
import type {
  ClaimDto,
  CommissionEntryView,
  EarningsSummaryDto,
  LedgerEarningEntryDto,
  LedgerEntryDto,
  ReferralFunnelDto,
  ReferralMeDto,
} from '../../../app/core/Engine/controllers/rewards-money-controller/types';
import Routes from '../../../app/constants/navigation/Routes';
import {
  createRouteParamsProbe,
  getRouteProbeTestId,
  renderScreenWithRoutes,
} from '../render';
import {
  CASHBACK_LEDGER_FIXTURE,
  CLAIMABLE_EARNINGS_SUMMARY,
  COMMISSIONS_FIXTURE,
  EARNINGS_HISTORY_ROW,
  referralMeFixture,
  REFERRAL_FUNNEL_FIXTURE,
  REWARDS_MONEY_PROFILE_ID,
  rewardsMoneyViewState,
  windowedEarningsSummary,
  type RewardsMoneyViewStateOptions,
} from '../presets/rewardsMoney';

const engineCall = Engine.controllerMessenger.call as jest.Mock;

/** A payee who can claim. Prefetch and Claim both read this unless a test overrides it. */
const CLEARED_TAX_ME = {
  state: 'COMPLETE_OR_VERIFIED',
  next_action: 'NONE',
  reason: null,
  clears_until: null,
  cleared: true,
  can_change_answer: false,
};
const baseEngineCall = engineCall.getMockImplementation();

type EngineHandler = (...args: unknown[]) => unknown;

export type InitiateClaimMode = 'hang' | 'under_review';

export interface RewardsMoneyEngineOptions {
  referralMe?: ReferralMeDto;
  summary?: EarningsSummaryDto;
  /** Returned by the unwindowed summary read after an under-review refusal. */
  summaryAfterRefusal?: EarningsSummaryDto;
  history?: LedgerEntryDto[] | 'pending';
  cashback?: LedgerEarningEntryDto[] | 'pending';
  funnel?: ReferralFunnelDto | 'pending';
  commissions?: CommissionEntryView[];
  claims?: ClaimDto[];
  initiateClaim?: InitiateClaimMode;
  handlers?: Record<string, EngineHandler>;
}

interface SummaryParams {
  from?: string;
  to?: string;
}

function summaryParams(args: unknown[]): SummaryParams {
  const params = args[0];
  if (!params || typeof params !== 'object') {
    return {};
  }
  return params as SummaryParams;
}

function ledgerParams(args: unknown[]): { includeClaims?: boolean } {
  const params = args[0];
  if (!params || typeof params !== 'object') {
    return {};
  }
  return params as { includeClaims?: boolean };
}

function pendingPage(): Promise<never> {
  return new Promise(() => undefined);
}

/**
 * Installs Rewards Money reads on the shared Engine mock.
 *
 * `mockReset` drops a previous test's implementation. Unknown
 * RewardsMoneyController actions throw. Everything else, including
 * MoneyAccountBalanceService:getVaultApy, delegates to the implementation
 * captured when this module loaded.
 */
export function installRewardsMoneyEngine({
  referralMe = referralMeFixture('referee'),
  summary = CLAIMABLE_EARNINGS_SUMMARY,
  summaryAfterRefusal,
  history = [EARNINGS_HISTORY_ROW],
  cashback = CASHBACK_LEDGER_FIXTURE,
  funnel = REFERRAL_FUNNEL_FIXTURE,
  commissions = COMMISSIONS_FIXTURE,
  claims = [],
  initiateClaim,
  handlers = {},
}: RewardsMoneyEngineOptions = {}): jest.Mock {
  let refused = false;

  const defaults: Record<string, EngineHandler> = {
    'RewardsMoneyController:getReferralMe': () => Promise.resolve(referralMe),
    'RewardsMoneyController:getEarningsSummary': (...args) => {
      const params = summaryParams(args);
      const current =
        refused && summaryAfterRefusal ? summaryAfterRefusal : summary;
      if (params.from) {
        return Promise.resolve(
          windowedEarningsSummary(current, params.from, params.to),
        );
      }
      return Promise.resolve(current);
    },
    'RewardsMoneyController:getEarningsLedger': (...args) => {
      const includeClaims = ledgerParams(args).includeClaims === true;
      const page = includeClaims ? history : cashback;
      if (page === 'pending') {
        return pendingPage();
      }
      return Promise.resolve({
        results: page,
        has_more: false,
        cursor: null,
        window: null,
      });
    },
    'RewardsMoneyController:getClaimHistory': () =>
      Promise.resolve({ results: claims, has_more: false, cursor: null }),
    'RewardsMoneyController:getReferralFunnel': () => {
      if (funnel === 'pending') {
        return pendingPage();
      }
      return Promise.resolve(funnel);
    },
    'RewardsMoneyController:getCommissions': () =>
      Promise.resolve({
        results: commissions,
        mechanisms: {
          REFERRAL_REV_SHARE: { claim_open: false, reason: null },
          SOCIAL_FOLLOW_TRADE: {
            claim_open: false,
            reason: 'MECHANISM_NOT_CLAIMABLE',
          },
        },
        has_more: false,
        cursor: null,
      }),
    'RewardsMoneyController:getTaxMe': () => Promise.resolve(CLEARED_TAX_ME),
    'RewardsMoneyController:initiateClaim': () => {
      if (initiateClaim === 'under_review') {
        refused = true;
        return Promise.reject(
          new RewardsMoneyClaimRefusalError(403, 'UNDER_REVIEW'),
        );
      }
      if (initiateClaim === 'hang') {
        return pendingPage();
      }
      return Promise.reject(new Error('initiateClaim was not stubbed'));
    },
  };

  const resolved: Record<string, EngineHandler> = { ...defaults, ...handlers };

  engineCall.mockReset();
  engineCall.mockImplementation((action: string, ...args: unknown[]) => {
    const handler = resolved[action];
    if (handler) {
      return handler(...args);
    }
    if (action.startsWith('RewardsMoneyController:')) {
      throw new Error(`Unexpected RewardsMoneyController call: ${action}`);
    }
    if (baseEngineCall) {
      return baseEngineCall(action, ...args);
    }
    return Promise.resolve(undefined);
  });

  return engineCall;
}

/**
 * The claim hook refuses through the app toast. Component-view renders do not
 * mount that host, so this one surfaces the toast label for the refusal tests.
 */
function RewardsMoneyToastHost({ children }: { children: React.ReactNode }) {
  const [label, setLabel] = React.useState<string | null>(null);
  const api = React.useMemo<ToastRef>(
    () => ({
      showToast: (options) => {
        const next = options.labelOptions[0]?.label;
        setLabel(typeof next === 'string' ? next : null);
      },
      closeToast: () => {
        setLabel(null);
      },
    }),
    [],
  );
  const toastRef = React.useRef<ToastRef | null>(api);
  toastRef.current = api;
  const value = React.useMemo(() => ({ toastRef }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {label === null ? null : <Text>{label}</Text>}
    </ToastContext.Provider>
  );
}

const FlowStack = createNativeStackNavigator();

function routeProbe(routeName: string): React.FC {
  const Probe = () => (
    <Text testID={getRouteProbeTestId(routeName)}>{routeName}</Text>
  );
  Probe.displayName = `RouteProbe(${routeName})`;
  return Probe;
}

/** Nested stack `navigateToRewardsRoute` targets through `REWARDS_FLOW`. */
function RewardsFlowProbe() {
  return (
    <FlowStack.Navigator>
      <FlowStack.Screen
        name={Routes.REWARDS_EARNINGS_HISTORY_VIEW}
        component={routeProbe(Routes.REWARDS_EARNINGS_HISTORY_VIEW)}
      />
      <FlowStack.Screen
        name={Routes.REWARDS_SETTINGS_VIEW}
        component={routeProbe(Routes.REWARDS_SETTINGS_VIEW)}
      />
      <FlowStack.Screen
        name={Routes.REWARDS_TRADING_REBATES_VIEW}
        component={routeProbe(Routes.REWARDS_TRADING_REBATES_VIEW)}
      />
      <FlowStack.Screen
        name={Routes.REWARDS_TRADING_COMMISSIONS_VIEW}
        component={routeProbe(Routes.REWARDS_TRADING_COMMISSIONS_VIEW)}
      />
    </FlowStack.Navigator>
  );
}

function rewardsFlowRoutes() {
  return [
    { name: Routes.REWARDS_FLOW, Component: RewardsFlowProbe },
    {
      name: Routes.MODAL.REWARDS_MONEY_CLAIMS_PAUSED_MODAL,
      Component: createRouteParamsProbe(
        Routes.MODAL.REWARDS_MONEY_CLAIMS_PAUSED_MODAL,
      ),
    },
    {
      name: Routes.MODAL.REWARDS_INFO_SHEET_MODAL,
      Component: RewardsInfoSheetModal,
    },
    {
      name: Routes.MODAL.REWARDS_TAX_QUESTION_SHEET,
      Component: TaxFormQuestionSheet,
    },
    {
      name: Routes.MODAL.REWARDS_TAX_OPEN_FORM_SHEET,
      Component: TaxFormOpenFormSheet,
    },
    {
      name: Routes.MODAL.REWARDS_TAX_CONTACT_SHEET,
      Component: TaxFormContactUsSheet,
    },
    {
      name: Routes.REWARDS_TAX_FORM_VIEW,
      Component: RewardsTaxFormView,
    },
    {
      name: Routes.WEBVIEW.MAIN,
      Component: SupportWebviewStack,
    },
  ];
}

function SupportWebviewStack() {
  return (
    <FlowStack.Navigator>
      <FlowStack.Screen
        name={Routes.WEBVIEW.SIMPLE}
        component={createRouteParamsProbe(Routes.WEBVIEW.SIMPLE)}
      />
    </FlowStack.Navigator>
  );
}

export type RenderRewardsMoneyOptions = RewardsMoneyEngineOptions &
  RewardsMoneyViewStateOptions;

function renderMoneyScreen(
  Component: React.ComponentType,
  name: string,
  options: RenderRewardsMoneyOptions,
) {
  const engine = installRewardsMoneyEngine({
    referralMe: referralMeFixture(options.persona ?? 'referee'),
    ...options,
  });
  const state = rewardsMoneyViewState(options);

  return {
    ...renderScreenWithRoutes(
      Component,
      { name },
      rewardsFlowRoutes(),
      { state },
      undefined,
      undefined,
      (children) => <RewardsMoneyToastHost>{children}</RewardsMoneyToastHost>,
    ),
    engine,
  };
}

export function renderEarningsTab(options: RenderRewardsMoneyOptions = {}) {
  const persona = options.persona ?? 'referee';

  function Screen() {
    return (
      <EarningsTab profileId={REWARDS_MONEY_PROFILE_ID} persona={persona} />
    );
  }

  return renderMoneyScreen(Screen, 'EarningsTab', { ...options, persona });
}

export function renderPerformanceTab(
  options: RenderRewardsMoneyOptions & { active?: boolean } = {},
) {
  const persona = options.persona ?? 'referee';
  const active = options.active ?? true;

  function Screen() {
    return (
      <PerformanceTab
        profileId={REWARDS_MONEY_PROFILE_ID}
        persona={persona}
        active={active}
      />
    );
  }

  return renderMoneyScreen(Screen, 'PerformanceTab', { ...options, persona });
}

let restoreRewardsDashboardReduxStore: (() => void) | undefined;

/**
 * Puts back the store `renderRewardsDashboard` replaced. Start sharing reads
 * Social V1 from `ReduxService.store`, not from the React provider.
 */
export function restoreRewardsDashboardStore(): void {
  restoreRewardsDashboardReduxStore?.();
}

/**
 * Rewards dashboard on the Money preset. Social V1 and the referral copy come
 * from Redux. The Social profile-onboarding route is a probe.
 */
export function renderRewardsDashboard(
  options: RenderRewardsMoneyOptions = {},
) {
  const engine = installRewardsMoneyEngine({
    referralMe: referralMeFixture(options.persona ?? 'plain'),
    ...options,
  });
  const state = rewardsMoneyViewState(options);
  const result = renderScreenWithRoutes(
    RewardsDashboard,
    { name: Routes.REWARDS_DASHBOARD },
    [{ name: Routes.SOCIAL.PROFILE_ONBOARDING }],
    { state },
  );

  restoreRewardsDashboardStore();
  let previousStore: ReduxStore | undefined;
  try {
    previousStore = ReduxService.store;
  } catch {
    previousStore = undefined;
  }
  ReduxService.store = result.store as unknown as ReduxStore;
  restoreRewardsDashboardReduxStore = () => {
    restoreRewardsDashboardReduxStore = undefined;
    if (previousStore) {
      ReduxService.store = previousStore;
    }
  };

  return { ...result, engine };
}

export function renderRewardsMoneyDashboard(
  options: RenderRewardsMoneyOptions = {},
) {
  return renderMoneyScreen(
    RewardsMoneyDashboard,
    Routes.REWARDS_MONEY_DASHBOARD,
    options,
  );
}

/**
 * Rewards Settings on the Money preset. Session profile, code validation, and
 * referee registration are Engine calls. The splash is a route probe.
 */
export function renderRewardsSettingsView(
  options: RenderRewardsMoneyOptions = {},
) {
  const persona = options.persona ?? 'plain';
  const referralMe = options.referralMe ?? referralMeFixture(persona);
  const engine = installRewardsMoneyEngine({
    ...options,
    referralMe,
    handlers: {
      'AuthenticationController:getSessionProfile': () =>
        Promise.resolve({ profileId: REWARDS_MONEY_PROFILE_ID }),
      'RewardsMoneyController:validateReferralCode': () =>
        Promise.resolve({ success: true }),
      'RewardsMoneyController:registerReferee': () => Promise.resolve(),
      'RewardsMoneyController:canChangeRewardsMoneyEnvUrl': () => false,
      ...options.handlers,
    },
  });
  const state = rewardsMoneyViewState({
    ...options,
    persona,
    referralMe,
    moneyControllerEnabled: options.moneyControllerEnabled ?? true,
  });

  return {
    ...renderScreenWithRoutes(
      RewardsSettingsView as unknown as React.ComponentType,
      { name: Routes.REWARDS_SETTINGS_VIEW },
      [{ name: Routes.REWARDS_MONEY_REFERRAL_ACCEPTED_SPLASH_VIEW }],
      { state },
    ),
    engine,
  };
}

export function renderEarningsHistory(options: RenderRewardsMoneyOptions = {}) {
  return renderMoneyScreen(
    RewardsEarningsHistoryView,
    Routes.REWARDS_EARNINGS_HISTORY_VIEW,
    options,
  );
}

export interface RenderRewardsMoneyInviteSheetOptions
  extends RenderRewardsMoneyOptions {
  referralCode?: string;
  entryType?: MoneyReferralEntryType;
}

export const REFERRAL_SPLASH_JOURNEY_TEST_IDS = {
  OPEN: 'open-referral-splash',
} as const;

export const REFERRAL_SPLASH_JOURNEY_DESTINATION_ROUTE = 'ReferralDestination';

export const REFERRAL_INVITE_JOURNEY_TEST_IDS = {
  HOST: 'referral-invite-host',
} as const;

function ReferralInviteJourneyHost() {
  const navigation = useNavigation<AppNavigationProp>();

  React.useEffect(() => {
    navigation.navigate(Routes.MODAL.REWARDS_MONEY_INVITE_SHEET);
  }, [navigation]);

  return <Text testID={REFERRAL_INVITE_JOURNEY_TEST_IDS.HOST}>Swap</Text>;
}

/**
 * Deeplink invite sheet pushed over a destination, with the accepted splash
 * registered as a probe. Code validation and referee registration are Engine
 * calls. Used to exercise the real accept/dismiss navigation.
 */
export function renderRewardsMoneyInviteSheet(
  options: RenderRewardsMoneyInviteSheetOptions = {},
) {
  const persona = options.persona ?? 'plain';
  const referralMe = options.referralMe ?? referralMeFixture(persona);
  const engine = installRewardsMoneyEngine({
    ...options,
    referralMe,
    handlers: {
      'AuthenticationController:getSessionProfile': () =>
        Promise.resolve({ profileId: REWARDS_MONEY_PROFILE_ID }),
      'RewardsMoneyController:validateReferralCode': () =>
        Promise.resolve({ success: true }),
      'RewardsMoneyController:registerReferee': () => Promise.resolve(),
      ...options.handlers,
    },
  });
  const state = rewardsMoneyViewState({
    ...options,
    persona,
    referralMe,
    moneyControllerEnabled: options.moneyControllerEnabled ?? true,
  });

  function InviteSheetScreen() {
    return (
      <AcceptInviteSheet
        route={{
          params: {
            referralCode: options.referralCode,
            entryType: options.entryType,
          },
        }}
      />
    );
  }

  return {
    ...renderScreenWithRoutes(
      ReferralInviteJourneyHost as unknown as React.ComponentType,
      { name: REFERRAL_SPLASH_JOURNEY_DESTINATION_ROUTE },
      [
        {
          name: Routes.MODAL.REWARDS_MONEY_INVITE_SHEET,
          Component: InviteSheetScreen as unknown as React.ComponentType,
        },
        { name: Routes.REWARDS_MONEY_REFERRAL_ACCEPTED_SPLASH_VIEW },
      ],
      { state },
    ),
    engine,
  };
}

function ReferralSplashJourneyDestination() {
  const navigation = useNavigation<AppNavigationProp>();
  const isFocused = useIsFocused();

  return (
    <Pressable
      testID={REFERRAL_SPLASH_JOURNEY_TEST_IDS.OPEN}
      onPress={() =>
        navigation.navigate(Routes.REWARDS_MONEY_REFERRAL_ACCEPTED_SPLASH_VIEW)
      }
    >
      {isFocused ? (
        <Text
          testID={getRouteProbeTestId(
            REFERRAL_SPLASH_JOURNEY_DESTINATION_ROUTE,
          )}
        >
          Swap
        </Text>
      ) : null}
    </Pressable>
  );
}

/**
 * Real splash pushed over a Swap destination. Used to assert that closing the
 * splash returns to the link's destination, not the Money dashboard.
 */
export function renderRewardsMoneyReferralSplashJourney(
  options: RenderRewardsMoneyOptions = {},
) {
  const persona = options.persona ?? 'referee';
  const referralMe = options.referralMe ?? referralMeFixture(persona);
  const state = rewardsMoneyViewState({
    ...options,
    persona,
    referralMe,
    pendingReferralCode: options.pendingReferralCode ?? 'KOL1',
  });

  return renderScreenWithRoutes(
    ReferralSplashJourneyDestination as unknown as React.ComponentType,
    { name: REFERRAL_SPLASH_JOURNEY_DESTINATION_ROUTE },
    [
      {
        name: Routes.REWARDS_MONEY_REFERRAL_ACCEPTED_SPLASH_VIEW,
        Component:
          RewardsMoneyReferralAcceptedSplashView as unknown as React.ComponentType,
      },
      { name: Routes.REWARDS_VIEW },
    ],
    { state },
  );
}

/**
 * Splash with no back stack. Closing it must open the Money dashboard.
 */
export function renderRewardsMoneyReferralAcceptedSplash(
  options: RenderRewardsMoneyOptions = {},
) {
  const persona = options.persona ?? 'referee';
  const referralMe = options.referralMe ?? referralMeFixture(persona);
  const state = rewardsMoneyViewState({
    ...options,
    persona,
    referralMe,
    pendingReferralCode: options.pendingReferralCode ?? 'KOL1',
  });

  return renderScreenWithRoutes(
    RewardsMoneyReferralAcceptedSplashView as unknown as React.ComponentType,
    { name: Routes.REWARDS_MONEY_REFERRAL_ACCEPTED_SPLASH_VIEW },
    [{ name: Routes.REWARDS_VIEW }],
    { state },
  );
}
