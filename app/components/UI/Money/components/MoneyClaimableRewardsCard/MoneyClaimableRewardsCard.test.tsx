import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import {
  formatUsd,
  KOL_EARNINGS_FIXTURE,
} from '../../../Rewards/components/KolDashboard/rewardsUiFixtures';
import {
  claimAllRewards,
  consumeRewardsDashboardTab,
  getClaimableRewards,
  getPendingRewardsDashboardTab,
  resetClaimableRewards,
} from '../../../Rewards/components/KolDashboard/rewardsClaimStore';
import MoneyClaimableRewardsCard from './MoneyClaimableRewardsCard';
import { MoneyClaimableRewardsCardTestIds } from './MoneyClaimableRewardsCard.testIds';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

describe('MoneyClaimableRewardsCard', () => {
  beforeEach(() => {
    // The claim balance is shared with the Rewards Claims tab, so each test
    // starts at the fixture amount.
    resetClaimableRewards();
    consumeRewardsDashboardTab();
    mockNavigate.mockClear();
  });

  it('renders the claimable rewards label', () => {
    const { getByText } = render(<MoneyClaimableRewardsCard />);

    expect(
      getByText(strings('money.claimable_rewards.title')),
    ).toBeOnTheScreen();
  });

  it('renders the same amount as the Rewards claims tab', () => {
    const { getByTestId } = render(<MoneyClaimableRewardsCard />);

    expect(
      getByTestId(MoneyClaimableRewardsCardTestIds.AMOUNT),
    ).toHaveTextContent(formatUsd(KOL_EARNINGS_FIXTURE.availableToClaim));
  });

  it('renders the claim button', () => {
    const { getByTestId } = render(<MoneyClaimableRewardsCard />);

    expect(
      getByTestId(MoneyClaimableRewardsCardTestIds.CLAIM_BUTTON),
    ).toHaveTextContent(strings('rewards.kol.claim'));
  });

  it('renders a 32px-spaced divider under the card', () => {
    const { getByTestId } = render(<MoneyClaimableRewardsCard />);

    expect(
      getByTestId(MoneyClaimableRewardsCardTestIds.DIVIDER),
    ).toBeOnTheScreen();
  });

  it('opens the Rewards Claims tab when Claim is pressed', () => {
    const { getByTestId } = render(<MoneyClaimableRewardsCard />);

    fireEvent.press(getByTestId(MoneyClaimableRewardsCardTestIds.CLAIM_BUTTON));

    expect(getPendingRewardsDashboardTab()).toBe('earnings');
    expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_VIEW);
    expect(getClaimableRewards()).toBe(KOL_EARNINGS_FIXTURE.availableToClaim);
  });

  it('renders nothing when the rewards were already claimed on the Claims tab', () => {
    claimAllRewards();

    const { queryByTestId } = render(<MoneyClaimableRewardsCard />);

    expect(
      queryByTestId(MoneyClaimableRewardsCardTestIds.CONTAINER),
    ).toBeNull();
  });
});
