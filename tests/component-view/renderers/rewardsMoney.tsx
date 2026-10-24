import '../mocks';
import React from 'react';
import Engine from '../../../app/core/Engine';
import { renderScreenWithRoutes } from '../render';
import Routes from '../../../app/constants/navigation/Routes';
import { RewardsHome } from '../../../app/components/Nav/Main/MainNavigator';
import AcceptInviteSheet from '../../../app/components/UI/Rewards/components/Money/AcceptInviteSheet';
import RewardsMoneyReferralAcceptedSplashView from '../../../app/components/UI/Rewards/Views/RewardsMoneyReferralAcceptedSplashView';
import type {
  EarningsSummaryDto,
  ReferralMeDto,
} from '../../../app/core/Engine/controllers/rewards-money-controller/types';
import {
  initialStateRewardsMoney,
  REWARDS_MONEY_EARNINGS_SUMMARY,
  REWARDS_MONEY_PROFILE_ID,
} from '../presets/rewardsMoney';

export interface RewardsMoneyEngineOptions {
  /** `'pending'` never resolves, so the tab stays on its skeleton. */
  referralMe?: ReferralMeDto | 'pending';
  earningsSummary?: EarningsSummaryDto;
  registerReferee?: () => Promise<void>;
}

/**
 * The component-view Engine mock is the only seam. Referral-me, the earnings
 * summary, and referee registration all arrive through it.
 */
export function installRewardsMoneyEngine(
  options: RewardsMoneyEngineOptions = {},
): jest.Mock {
  const mockCall = Engine.controllerMessenger.call as jest.Mock;
  const referralMe = options.referralMe;
  const earningsSummary =
    options.earningsSummary ?? REWARDS_MONEY_EARNINGS_SUMMARY;

  mockCall.mockReset();
  mockCall.mockImplementation((action: string) => {
    if (action === 'AuthenticationController:getSessionProfile') {
      return Promise.resolve({ profileId: REWARDS_MONEY_PROFILE_ID });
    }
    if (action === 'RewardsMoneyController:getReferralMe') {
      if (referralMe === 'pending') {
        return new Promise(() => undefined);
      }
      return Promise.resolve(referralMe);
    }
    if (action === 'RewardsMoneyController:getEarningsSummary') {
      return Promise.resolve(earningsSummary);
    }
    if (action === 'RewardsMoneyController:validateReferralCode') {
      return Promise.resolve({ success: true });
    }
    if (action === 'RewardsMoneyController:registerReferee') {
      return options.registerReferee
        ? options.registerReferee()
        : Promise.resolve(undefined);
    }
    if (action === 'RewardsController:getCandidateSubscriptionId') {
      return Promise.resolve(null);
    }
    if (action === 'RewardsController:getClientVersionRequirements') {
      return Promise.resolve({ minimumMobileVersion: null });
    }
    return Promise.resolve(undefined);
  });

  return mockCall;
}

export function renderRewardsHome() {
  const state = initialStateRewardsMoney().build();

  return renderScreenWithRoutes(
    RewardsHome as unknown as React.ComponentType,
    { name: Routes.REWARDS_VIEW },
    [],
    { state },
  );
}

export function renderAcceptInviteSheet(referralMe: ReferralMeDto) {
  const state = initialStateRewardsMoney({ referralMe }).build();

  return renderScreenWithRoutes(
    AcceptInviteSheet as unknown as React.ComponentType,
    { name: Routes.MODAL.REWARDS_MONEY_INVITE_SHEET },
    [
      {
        name: Routes.REWARDS_MONEY_REFERRAL_ACCEPTED_SPLASH_VIEW,
        Component:
          RewardsMoneyReferralAcceptedSplashView as unknown as React.ComponentType<object>,
      },
    ],
    { state },
    { referralCode: 'KOL1' },
  );
}
