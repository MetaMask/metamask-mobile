import '../mocks';
import React from 'react';
import { Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ToastContext } from '../../../app/component-library/components/Toast/Toast.context';
import type { ToastRef } from '../../../app/component-library/components/Toast/Toast.types';
import Engine from '../../../app/core/Engine';
import EarningsTab from '../../../app/components/UI/Rewards/components/Money/Tabs/EarningsTab';
import PerformanceTab from '../../../app/components/UI/Rewards/components/Money/Tabs/PerformanceTab';
import RewardsMoneyDashboard from '../../../app/components/UI/Rewards/Views/RewardsMoneyDashboard';
import RewardsEarningsHistoryView from '../../../app/components/UI/Rewards/Views/RewardsEarningsHistoryView';
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
      Component: createRouteParamsProbe(Routes.MODAL.REWARDS_INFO_SHEET_MODAL),
    },
  ];
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

  function ScreenWithToast() {
    return (
      <RewardsMoneyToastHost>
        <Component />
      </RewardsMoneyToastHost>
    );
  }

  return {
    ...renderScreenWithRoutes(ScreenWithToast, { name }, rewardsFlowRoutes(), {
      state,
    }),
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

export function renderRewardsMoneyDashboard(
  options: RenderRewardsMoneyOptions = {},
) {
  return renderMoneyScreen(
    RewardsMoneyDashboard,
    Routes.REWARDS_MONEY_DASHBOARD,
    options,
  );
}

export function renderEarningsHistory(options: RenderRewardsMoneyOptions = {}) {
  return renderMoneyScreen(
    RewardsEarningsHistoryView,
    Routes.REWARDS_EARNINGS_HISTORY_VIEW,
    options,
  );
}
