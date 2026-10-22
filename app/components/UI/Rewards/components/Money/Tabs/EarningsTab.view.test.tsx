/**
 * Claim button states through the real summary hook.
 *
 * Run with:
 * yarn jest -c jest.config.view.js app/components/UI/Rewards/components/Money/Tabs/EarningsTab.view.test.tsx --runInBand --silent --coverage=false
 */
import '../../../../../../../tests/component-view/mocks';
import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import type { EarningsSummaryDto } from '../../../../../../core/Engine/controllers/rewards-money-controller/types';
import Routes from '../../../../../../constants/navigation/Routes';
import {
  createRouteParamsProbe,
  getRouteParamsProbeTestId,
  renderScreenWithRoutes,
} from '../../../../../../../tests/component-view/render';
import {
  CLAIMABLE_EARNINGS_SUMMARY,
  CLAIMED_EARNINGS_SUMMARY,
  PAUSED_EARNINGS_SUMMARY,
  REWARDS_MONEY_PROFILE_ID,
  installRewardsMoneyReads,
  rewardsMoneyViewState,
} from '../../../../../../../tests/component-view/presets/rewardsMoney';
import { CLAIMABLE_REWARDS_CARD_TEST_IDS } from '../ClaimableRewardsCard';
import EarningsTab from './EarningsTab';

const ClaimsPausedProbe = createRouteParamsProbe(
  Routes.MODAL.REWARDS_MONEY_CLAIMS_PAUSED_MODAL,
);

function RefereeEarningsTab() {
  return <EarningsTab profileId={REWARDS_MONEY_PROFILE_ID} persona="referee" />;
}

function renderEarningsTab(summary: EarningsSummaryDto) {
  installRewardsMoneyReads(summary);
  const state = rewardsMoneyViewState(summary);
  return renderScreenWithRoutes(
    RefereeEarningsTab as unknown as React.ComponentType,
    { name: 'EarningsTab' },
    [
      {
        name: Routes.MODAL.REWARDS_MONEY_CLAIMS_PAUSED_MODAL,
        Component: ClaimsPausedProbe,
      },
    ],
    { state },
  );
}

function routeParams(node: { props: { children: unknown } }): {
  title?: string;
  description?: string;
  totals?: Record<string, string>;
} {
  const raw = node.props.children;
  const text = Array.isArray(raw) ? raw.join('') : String(raw);
  return JSON.parse(text) as {
    title?: string;
    description?: string;
    totals?: Record<string, string>;
  };
}

describe('EarningsTab claim states', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows Claim when cashback reaches the minimum', async () => {
    const { findByTestId, queryByTestId } = renderEarningsTab(
      CLAIMABLE_EARNINGS_SUMMARY,
    );

    expect(
      await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.PAUSED_BUTTON),
    ).toBeNull();
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIMED_BUTTON),
    ).toBeNull();
  });

  it('opens the claims paused sheet with the held and blocked totals', async () => {
    const { findByTestId, queryByTestId } = renderEarningsTab(
      PAUSED_EARNINGS_SUMMARY,
    );

    const pausedButton = await findByTestId(
      CLAIMABLE_REWARDS_CARD_TEST_IDS.PAUSED_BUTTON,
    );
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    ).toBeNull();
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIMED_BUTTON),
    ).toBeNull();

    fireEvent.press(pausedButton);

    const params = routeParams(
      await findByTestId(
        getRouteParamsProbeTestId(
          Routes.MODAL.REWARDS_MONEY_CLAIMS_PAUSED_MODAL,
        ),
      ),
    );
    expect(params.title).toBe('Claims paused');
    expect(params.description).toBe('You cannot claim rewards right now.');
    expect(params.totals).toEqual({
      lifetime_total: PAUSED_EARNINGS_SUMMARY.lifetime_total,
      claimable: PAUSED_EARNINGS_SUMMARY.claimable,
      held: PAUSED_EARNINGS_SUMMARY.held,
      blocked: PAUSED_EARNINGS_SUMMARY.blocked,
      voided: PAUSED_EARNINGS_SUMMARY.voided,
      pending: PAUSED_EARNINGS_SUMMARY.pending,
      claimed: PAUSED_EARNINGS_SUMMARY.claimed,
    });
  });

  it('shows a disabled Claimed button when only claimed earnings remain', async () => {
    const { findByTestId, queryByTestId } = renderEarningsTab(
      CLAIMED_EARNINGS_SUMMARY,
    );

    expect(
      await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIMED_BUTTON),
    ).toBeDisabled();
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    ).toBeNull();
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.PAUSED_BUTTON),
    ).toBeNull();
  });
});
