import '../mocks';
import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Engine from '../../../app/core/Engine';
import Routes from '../../../app/constants/navigation/Routes';
import renderWithProvider from '../../../app/util/test/renderWithProvider';
import { RewardsHome } from '../../../app/components/Nav/Main/MainNavigator';
import AcceptInviteSheet from '../../../app/components/UI/Rewards/components/Money/AcceptInviteSheet';
import RewardsMoneyDashboard from '../../../app/components/UI/Rewards/Views/RewardsMoneyDashboard';
import RewardsMoneyReferralAcceptedSplashView from '../../../app/components/UI/Rewards/Views/RewardsMoneyReferralAcceptedSplashView';
import type {
  EarningsSummaryDto,
  ReferralMeDto,
} from '../../../app/core/Engine/controllers/rewards-money-controller/types';
import { QueryClientBoundary, renderScreenWithRoutes } from '../render';
import {
  earningsSummaryFixture,
  initialStateRewardsMoney,
  REWARDS_MONEY_PROFILE_ID,
  type InitialStateRewardsMoneyOptions,
} from '../presets/rewardsMoney';

/**
 * One `Engine.controllerMessenger.call` handler.
 *
 * Later Money stacks (Performance, Earnings, Monad claim) pass `handlers`
 * to add or replace a `RewardsMoneyController:*` action without rewriting
 * the defaults.
 */
export type RewardsMoneyEngineHandler = (...args: unknown[]) => unknown;

export interface RewardsMoneyEngineOptions {
  /** `'pending'` never resolves. `'reject'` fails the read with a generic Error. */
  referralMe?: ReferralMeDto | 'pending' | 'reject';
  earningsSummary?: EarningsSummaryDto | 'reject';
  registerReferee?: () => Promise<void>;
  /**
   * `{ success: false }` is the server rejecting the code.
   * A function stands in for a thrown validation error.
   */
  validateReferralCode?:
    | { success: boolean }
    | (() => Promise<{ success: boolean }>);
  /** Spread after the defaults, so a key here replaces that action. */
  handlers?: Record<string, RewardsMoneyEngineHandler>;
}

export interface RewardsMoneyRoute {
  name: string;
  Component?: React.ComponentType<object>;
}

export interface RewardsMoneyRenderOptions
  extends InitialStateRewardsMoneyOptions {
  /** Appended after the settings and terms probes. */
  extraRoutes?: RewardsMoneyRoute[];
}

const engineCall = Engine.controllerMessenger.call as jest.Mock;

/**
 * Captured once, before any test replaces the implementation.
 * `mockReset` would drop this, including `MoneyAccountBalanceService:getVaultApy`.
 */
const baseEngineCall = engineCall.getMockImplementation();

const REWARDS_CONTROLLER_HANDLERS: Record<string, RewardsMoneyEngineHandler> = {
  'RewardsController:getCandidateSubscriptionId': () => Promise.resolve(null),
  'RewardsController:getClientVersionRequirements': () =>
    Promise.resolve({ minimumMobileVersion: null }),
  'RewardsController:getCampaigns': () => Promise.resolve([]),
  'RewardsController:getBenefits': () =>
    Promise.resolve({ benefits: [], limit: 0, lastFetched: 0 }),
  'RewardsController:getReferralDetails': () => Promise.resolve(null),
  'RewardsController:getSeasonMetadata': () => Promise.resolve(null),
  'RewardsController:isOptInSupported': () => true,
  'RewardsController:getOptInStatus': () =>
    Promise.resolve({ ois: [], sids: [] }),
};

function callBaseEngine(action: string, args: unknown[]): unknown {
  if (baseEngineCall) {
    return baseEngineCall(action, ...args);
  }
  return Promise.resolve(undefined);
}

/**
 * The component-view Engine mock is the only seam. Unknown
 * `RewardsMoneyController:*` actions throw so a new read cannot pass by
 * resolving `undefined`. Everything else keeps the shared mock defaults.
 */
export function installRewardsMoneyEngine(
  options: RewardsMoneyEngineOptions = {},
): jest.Mock {
  const referralMe = options.referralMe;
  const earningsSummary = options.earningsSummary ?? earningsSummaryFixture();
  const validateReferralCode = options.validateReferralCode ?? {
    success: true,
  };

  const handlers: Record<string, RewardsMoneyEngineHandler> = {
    'AuthenticationController:getSessionProfile': () =>
      Promise.resolve({ profileId: REWARDS_MONEY_PROFILE_ID }),
    'RewardsMoneyController:getReferralMe': () => {
      if (referralMe === 'pending') {
        return new Promise(() => undefined);
      }
      if (referralMe === 'reject') {
        return Promise.reject(new Error('referral me failed'));
      }
      return Promise.resolve(referralMe);
    },
    'RewardsMoneyController:getEarningsSummary': () => {
      if (earningsSummary === 'reject') {
        return Promise.reject(new Error('earnings summary failed'));
      }
      return Promise.resolve(earningsSummary);
    },
    'RewardsMoneyController:validateReferralCode': () =>
      typeof validateReferralCode === 'function'
        ? validateReferralCode()
        : Promise.resolve(validateReferralCode),
    'RewardsMoneyController:registerReferee': () =>
      options.registerReferee
        ? options.registerReferee()
        : Promise.resolve(undefined),
    ...REWARDS_CONTROLLER_HANDLERS,
    ...options.handlers,
  };

  engineCall.mockClear();
  engineCall.mockImplementation((action: string, ...args: unknown[]) => {
    const handler = handlers[action];
    if (handler) {
      return handler(...args);
    }
    if (action.startsWith('RewardsMoneyController:')) {
      throw new Error(
        `Unexpected RewardsMoneyController action "${action}". Add it to installRewardsMoneyEngine handlers.`,
      );
    }
    return callBaseEngine(action, args);
  });

  return engineCall;
}

const DEFAULT_PROBE_ROUTES: RewardsMoneyRoute[] = [
  { name: Routes.REWARDS_FLOW },
  { name: Routes.MODAL.REWARDS_MONEY_TERMS_SHEET },
  // The points dashboard navigates here when the active account is not opted
  // in. An unregistered route throws while dev-logging the action payload.
  { name: Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL },
];

function probeRoutes(
  extraRoutes: RewardsMoneyRoute[] = [],
): RewardsMoneyRoute[] {
  return [...DEFAULT_PROBE_ROUTES, ...extraRoutes];
}

/** Tab the splash opens: Home → RewardsView → RewardsHome. */
const RewardsTabStack = createNativeStackNavigator();

function RewardsTabHost() {
  return (
    <RewardsTabStack.Navigator>
      <RewardsTabStack.Screen
        name={Routes.REWARDS_VIEW}
        component={RewardsHome}
      />
    </RewardsTabStack.Navigator>
  );
}

export function renderRewardsHome(options: RewardsMoneyRenderOptions = {}) {
  const { extraRoutes, ...stateOptions } = options;
  const state = initialStateRewardsMoney(stateOptions).build();

  return renderScreenWithRoutes(
    RewardsHome,
    { name: Routes.REWARDS_VIEW },
    probeRoutes(extraRoutes),
    { state },
  );
}

/**
 * The dashboard by itself, with a settled-empty referral entry unless the
 * caller seeds a payload. RewardsHome would route that empty entry away
 * from this screen, so the retry banner is reached here directly.
 */
export function renderRewardsMoneyDashboard(
  options: RewardsMoneyRenderOptions = {},
) {
  const { extraRoutes, ...stateOptions } = options;
  const state = initialStateRewardsMoney({
    referralMeSettledEmpty: true,
    ...stateOptions,
  }).build();

  return renderScreenWithRoutes(
    RewardsMoneyDashboard,
    { name: Routes.REWARDS_MONEY_DASHBOARD },
    probeRoutes(extraRoutes),
    { state },
  );
}

/** Parent route under the invite sheet so `goBack` has somewhere to land. */
export const REWARDS_MONEY_INVITE_UNDERLAY = 'RewardsMoneyInviteUnderlay';

export const REWARDS_MONEY_INVITE_UNDERLAY_TEST_ID =
  'rewards-money-invite-underlay';

function RewardsMoneyInviteUnderlay() {
  return (
    <Text testID={REWARDS_MONEY_INVITE_UNDERLAY_TEST_ID}>
      {REWARDS_MONEY_INVITE_UNDERLAY}
    </Text>
  );
}

const InviteStack = createNativeStackNavigator();

/**
 * Invite sheet above an underlay, with the splash and the Rewards tab registered.
 *
 * A stack's initial state holds only its first route, so registering a parent
 * screen is not enough for `goBack`. The container state starts on the sheet
 * with the underlay already underneath it.
 */
export function renderAcceptInviteSheet(referralMe: ReferralMeDto) {
  const state = initialStateRewardsMoney({ referralMe }).build();

  return renderWithProvider(
    <QueryClientBoundary>
      <NavigationContainer
        initialState={{
          index: 1,
          routes: [
            { name: REWARDS_MONEY_INVITE_UNDERLAY },
            {
              name: Routes.MODAL.REWARDS_MONEY_INVITE_SHEET,
              params: { referralCode: 'KOL1' },
            },
          ],
        }}
      >
        <InviteStack.Navigator>
          <InviteStack.Screen
            name={REWARDS_MONEY_INVITE_UNDERLAY}
            component={RewardsMoneyInviteUnderlay}
          />
          <InviteStack.Screen
            name={Routes.MODAL.REWARDS_MONEY_INVITE_SHEET}
            component={AcceptInviteSheet}
            initialParams={{ referralCode: 'KOL1' }}
          />
          <InviteStack.Screen
            name={Routes.REWARDS_MONEY_REFERRAL_ACCEPTED_SPLASH_VIEW}
            component={RewardsMoneyReferralAcceptedSplashView}
          />
          <InviteStack.Screen
            name={Routes.HOME_TABS}
            component={RewardsTabHost}
          />
        </InviteStack.Navigator>
      </NavigationContainer>
    </QueryClientBoundary>,
    { state },
    false,
  );
}
