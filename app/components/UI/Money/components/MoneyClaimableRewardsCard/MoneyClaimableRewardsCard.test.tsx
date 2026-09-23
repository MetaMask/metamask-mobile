import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  formatUsd,
  KOL_EARNINGS_FIXTURE,
} from '../../../Rewards/components/KolDashboard/rewardsUiFixtures';
import {
  claimAllRewards,
  getClaimableRewards,
  resetClaimableRewards,
} from '../../../Rewards/components/KolDashboard/rewardsClaimStore';
import MoneyClaimableRewardsCard from './MoneyClaimableRewardsCard';
import { MoneyClaimableRewardsCardTestIds } from './MoneyClaimableRewardsCard.testIds';

const mockShowToast = jest.fn();
const mockClaimSuccess = jest.fn(() => ({ title: 'claim-success' }));

jest.mock('../../hooks/useMoneyToasts', () => ({
  __esModule: true,
  default: () => ({
    showToast: mockShowToast,
    MoneyToastOptions: {
      claimSuccess: mockClaimSuccess,
    },
  }),
}));

describe('MoneyClaimableRewardsCard', () => {
  beforeEach(() => {
    // The claim balance is shared with the Rewards Claims tab, so it has to
    // start each test at the fixture amount.
    resetClaimableRewards();
    mockShowToast.mockClear();
    mockClaimSuccess.mockClear();
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

  it('shows the success toast when Claim is pressed', async () => {
    const { getByTestId, queryByTestId } = render(
      <MoneyClaimableRewardsCard />,
    );

    fireEvent.press(getByTestId(MoneyClaimableRewardsCardTestIds.CLAIM_BUTTON));

    expect(mockClaimSuccess).toHaveBeenCalledTimes(1);
    expect(mockShowToast).toHaveBeenCalledWith({ title: 'claim-success' });
    await waitFor(() => {
      expect(
        queryByTestId(MoneyClaimableRewardsCardTestIds.CONTAINER),
      ).toBeNull();
    });
  });

  it('hides the card after Claim is pressed with reduce motion', async () => {
    const { getByTestId, queryByTestId } = render(
      <MoneyClaimableRewardsCard />,
    );

    fireEvent.press(getByTestId(MoneyClaimableRewardsCardTestIds.CLAIM_BUTTON));

    await waitFor(() => {
      expect(
        queryByTestId(MoneyClaimableRewardsCardTestIds.CONTAINER),
      ).toBeNull();
    });
  });

  it('zeroes the balance the Rewards Claims tab reads when Claim is pressed', async () => {
    const { getByTestId, queryByTestId } = render(
      <MoneyClaimableRewardsCard />,
    );

    fireEvent.press(getByTestId(MoneyClaimableRewardsCardTestIds.CLAIM_BUTTON));

    expect(getClaimableRewards()).toBe(0);
    await waitFor(() => {
      expect(
        queryByTestId(MoneyClaimableRewardsCardTestIds.CONTAINER),
      ).toBeNull();
    });
  });

  it('renders nothing when the rewards were already claimed on the Claims tab', () => {
    claimAllRewards();

    const { queryByTestId } = render(<MoneyClaimableRewardsCard />);

    expect(
      queryByTestId(MoneyClaimableRewardsCardTestIds.CONTAINER),
    ).toBeNull();
  });
});
