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
  getIsTaxFormPending,
  markTaxFormPending,
  resetClaimableRewards,
  resetTaxFormPending,
} from '../../../Rewards/components/KolDashboard/rewardsClaimStore';
import { KOL_DASHBOARD_SELECTORS } from '../../../Rewards/components/KolDashboard/KolDashboard.testIds';
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

const completeEligibleClaim = (
  getByTestId: (id: string) => React.ReactTestInstance,
) => {
  fireEvent.press(getByTestId(MoneyClaimableRewardsCardTestIds.CLAIM_BUTTON));
  fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.CLAIM_RESIDENCY_NO));
};

describe('MoneyClaimableRewardsCard', () => {
  beforeEach(() => {
    // The claim balance and tax form state are shared with the Rewards Claims
    // tab, so each test starts at the fixture amount with no pending form.
    resetClaimableRewards();
    resetTaxFormPending();
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

  it('renders the expiring-rewards notice on the claim card', () => {
    const { getByTestId, getByText } = render(<MoneyClaimableRewardsCard />);

    expect(
      getByTestId(MoneyClaimableRewardsCardTestIds.EXPIRY_NOTICE),
    ).toBeOnTheScreen();
    expect(
      getByText(
        strings('rewards.kol.claim_expiry_warning', {
          amount: formatUsd(KOL_EARNINGS_FIXTURE.expiringSoonAmount),
          days: KOL_EARNINGS_FIXTURE.expiringSoonDays,
        }),
      ),
    ).toBeOnTheScreen();
  });

  it('opens the residency sheet when Claim is pressed', () => {
    const { getByTestId, queryByTestId } = render(
      <MoneyClaimableRewardsCard />,
    );

    expect(
      queryByTestId(KOL_DASHBOARD_SELECTORS.CLAIM_RESIDENCY_SHEET),
    ).toBeNull();

    fireEvent.press(getByTestId(MoneyClaimableRewardsCardTestIds.CLAIM_BUTTON));

    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.CLAIM_RESIDENCY_SHEET),
    ).toBeOnTheScreen();
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('opens the tax form sheet when the user answers Yes', () => {
    const { getByTestId } = render(<MoneyClaimableRewardsCard />);

    fireEvent.press(getByTestId(MoneyClaimableRewardsCardTestIds.CLAIM_BUTTON));
    fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.CLAIM_RESIDENCY_YES));

    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.TAX_FORM_SHEET),
    ).toBeOnTheScreen();
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('opens the pending review sheet when claiming after leaving for the tax form', () => {
    const { getByTestId, queryByTestId } = render(
      <MoneyClaimableRewardsCard />,
    );

    fireEvent.press(getByTestId(MoneyClaimableRewardsCardTestIds.CLAIM_BUTTON));
    fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.CLAIM_RESIDENCY_YES));
    fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.TAX_FORM_CONTINUE));

    expect(getIsTaxFormPending()).toBe(true);

    fireEvent.press(getByTestId(MoneyClaimableRewardsCardTestIds.CLAIM_BUTTON));

    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.TAX_FORM_PENDING_SHEET),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(KOL_DASHBOARD_SELECTORS.CLAIM_RESIDENCY_SHEET),
    ).toBeNull();
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('asks about eligibility again when the tax form is dismissed with Not now', () => {
    const { getByTestId } = render(<MoneyClaimableRewardsCard />);

    fireEvent.press(getByTestId(MoneyClaimableRewardsCardTestIds.CLAIM_BUTTON));
    fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.CLAIM_RESIDENCY_YES));
    fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.TAX_FORM_REMIND_LATER));

    expect(getIsTaxFormPending()).toBe(false);

    fireEvent.press(getByTestId(MoneyClaimableRewardsCardTestIds.CLAIM_BUTTON));

    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.CLAIM_RESIDENCY_SHEET),
    ).toBeOnTheScreen();
  });

  it('reports pending review after the Claims tab sent the user to the tax form', () => {
    markTaxFormPending();

    const { getByTestId } = render(<MoneyClaimableRewardsCard />);

    fireEvent.press(getByTestId(MoneyClaimableRewardsCardTestIds.CLAIM_BUTTON));

    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.TAX_FORM_PENDING_SHEET),
    ).toBeOnTheScreen();
  });

  it('shows the success toast when the user answers No', async () => {
    const { getByTestId, queryByTestId } = render(
      <MoneyClaimableRewardsCard />,
    );

    completeEligibleClaim(getByTestId);

    expect(mockClaimSuccess).toHaveBeenCalledTimes(1);
    expect(mockShowToast).toHaveBeenCalledWith({ title: 'claim-success' });
    await waitFor(() => {
      expect(
        queryByTestId(MoneyClaimableRewardsCardTestIds.CONTAINER),
      ).toBeNull();
    });
  });

  it('hides the card after an eligible claim with reduce motion', async () => {
    const { getByTestId, queryByTestId } = render(
      <MoneyClaimableRewardsCard />,
    );

    completeEligibleClaim(getByTestId);

    await waitFor(() => {
      expect(
        queryByTestId(MoneyClaimableRewardsCardTestIds.CONTAINER),
      ).toBeNull();
    });
  });

  it('zeroes the balance the Rewards Claims tab reads after an eligible claim', async () => {
    const { getByTestId, queryByTestId } = render(
      <MoneyClaimableRewardsCard />,
    );

    completeEligibleClaim(getByTestId);

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
