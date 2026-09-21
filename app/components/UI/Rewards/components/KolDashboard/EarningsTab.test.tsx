import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import EarningsTab from './EarningsTab';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';
import {
  formatSignedUsd,
  formatUsd,
  KOL_EARNINGS_HISTORY_PREVIEW_COUNT,
} from './rewardsUiFixtures';
import Routes from '../../../../../constants/navigation/Routes';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

// `moduleNameMapper` resolves every `*.svg` import to the same shared mock, so
// this single factory covers both Phosphor icons that `HistoryKindAvatar` uses.
jest.mock('../../../../../images/rewards/hand-coins.svg', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return function MockPhosphorIcon() {
    return ReactActual.createElement(View, { testID: 'mock-phosphor-icon' });
  };
});

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('./ClaimMoneyFallOverlay', () => () => null);

const mockShowToast = jest.fn();
const mockSuccessToast = jest.fn((title: string) => ({ title }));

jest.mock('../../hooks/useRewardsToast', () => ({
  __esModule: true,
  default: () => ({
    showToast: mockShowToast,
    RewardsToastOptions: {
      success: mockSuccessToast,
    },
  }),
}));

const openPrototype = (
  getByTestId: (id: string) => React.ReactTestInstance,
) => {
  fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.CLAIM_BUTTON));
};

describe('EarningsTab', () => {
  beforeEach(() => {
    mockShowToast.mockClear();
    mockSuccessToast.mockClear();
    mockNavigate.mockClear();
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('opens the prototype picker when Claim is pressed', () => {
    const { getByTestId, queryByTestId } = render(<EarningsTab />);

    expect(
      queryByTestId(KOL_DASHBOARD_SELECTORS.CLAIM_PROTOTYPE_SHEET),
    ).toBeNull();

    openPrototype(getByTestId);

    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.CLAIM_PROTOTYPE_SHEET),
    ).toBeOnTheScreen();
  });

  it('opens the tax form required sheet from US - first time', () => {
    const { getByTestId, queryByTestId } = render(<EarningsTab />);

    openPrototype(getByTestId);
    fireEvent.press(
      getByTestId(KOL_DASHBOARD_SELECTORS.CLAIM_PROTOTYPE_US_FIRST_TIME),
    );

    expect(
      queryByTestId(KOL_DASHBOARD_SELECTORS.CLAIM_PROTOTYPE_SHEET),
    ).toBeNull();
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.TAX_FORM_SHEET),
    ).toBeOnTheScreen();
  });

  it('opens the pending-review sheet from US - pending', () => {
    const { getByTestId } = render(<EarningsTab />);

    openPrototype(getByTestId);
    fireEvent.press(
      getByTestId(KOL_DASHBOARD_SELECTORS.CLAIM_PROTOTYPE_US_PENDING),
    );

    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.TAX_FORM_PENDING_SHEET),
    ).toBeOnTheScreen();
  });

  it('runs the claim animation from US - approved with reduce motion', async () => {
    const onClaimableChange = jest.fn();
    const { getByTestId, getByText } = render(
      <EarningsTab onClaimableChange={onClaimableChange} />,
    );

    openPrototype(getByTestId);
    fireEvent.press(
      getByTestId(KOL_DASHBOARD_SELECTORS.CLAIM_PROTOTYPE_US_APPROVED),
    );

    expect(getByText('rewards.kol.claimed')).toBeOnTheScreen();
    expect(getByTestId(KOL_DASHBOARD_SELECTORS.CLAIM_BUTTON)).toBeDisabled();
    await waitFor(() => {
      expect(
        getByTestId(KOL_DASHBOARD_SELECTORS.AVAILABLE_TO_CLAIM),
      ).toHaveTextContent(formatUsd(0));
    });
    expect(onClaimableChange).toHaveBeenCalledWith(false);
    expect(mockSuccessToast).toHaveBeenCalledWith(
      'rewards.kol.claim_success_toast',
    );
  });

  it('opens the location sheet from Elsewhere', () => {
    const { getByTestId } = render(<EarningsTab />);

    openPrototype(getByTestId);
    fireEvent.press(
      getByTestId(KOL_DASHBOARD_SELECTORS.CLAIM_PROTOTYPE_ELSEWHERE),
    );

    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.REWARDS_LOCATION_SHEET),
    ).toBeOnTheScreen();
  });

  it('claims when all activity is confirmed as outside the US', async () => {
    const { getByTestId, getByText } = render(<EarningsTab />);

    openPrototype(getByTestId);
    fireEvent.press(
      getByTestId(KOL_DASHBOARD_SELECTORS.CLAIM_PROTOTYPE_ELSEWHERE),
    );
    fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.REWARDS_LOCATION_YES));

    expect(getByText('rewards.kol.claimed')).toBeOnTheScreen();
    await waitFor(() => {
      expect(
        getByTestId(KOL_DASHBOARD_SELECTORS.AVAILABLE_TO_CLAIM),
      ).toHaveTextContent(formatUsd(0));
    });
  });

  it('opens the claim-on-hold sheet when some activity was in the US', () => {
    const { getByTestId } = render(<EarningsTab />);

    openPrototype(getByTestId);
    fireEvent.press(
      getByTestId(KOL_DASHBOARD_SELECTORS.CLAIM_PROTOTYPE_ELSEWHERE),
    );
    fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.REWARDS_LOCATION_NO));

    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.CLAIM_ON_HOLD_SHEET),
    ).toBeOnTheScreen();
  });

  it('previews five history rows with two-decimal amounts', () => {
    const { getByTestId, getByText } = render(<EarningsTab />);

    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.HISTORY_LIST).children,
    ).toHaveLength(KOL_EARNINGS_HISTORY_PREVIEW_COUNT);
    expect(getByText('$91.20')).toBeOnTheScreen();
    expect(getByText(formatSignedUsd(12.4))).toBeOnTheScreen();
    expect(getByText(formatSignedUsd(-32.4))).toBeOnTheScreen();
  });

  it('includes referrals in the KOL breakdown and history', () => {
    const { getByText, getAllByText } = render(<EarningsTab />);

    expect(getByText('rewards.kol.referrals')).toBeOnTheScreen();
    expect(
      getAllByText('rewards.kol.history_referrals').length,
    ).toBeGreaterThan(0);
  });

  it('drops referrals from the invited breakdown and history', () => {
    const { queryByText, getByText } = render(<EarningsTab hideReferrals />);

    expect(queryByText('rewards.kol.referrals')).toBeNull();
    expect(queryByText('rewards.kol.history_referrals')).toBeNull();
    expect(getByText('rewards.kol.trade_commissions')).toBeOnTheScreen();
    expect(getByText('rewards.kol.trading_rebates')).toBeOnTheScreen();
  });

  it('opens the invited earnings history list without referrals', () => {
    const { getByTestId } = render(<EarningsTab hideReferrals />);

    fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.HISTORY_HEADER));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_FLOW, {
      screen: Routes.REWARDS_EARNINGS_HISTORY_VIEW,
      params: { hideReferrals: true },
    });
  });

  it('opens the earnings history list from the section header', () => {
    const { getByTestId } = render(<EarningsTab />);

    fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.HISTORY_HEADER));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_FLOW, {
      screen: Routes.REWARDS_EARNINGS_HISTORY_VIEW,
      params: undefined,
    });
  });

  it('opens the performance view from the breakdown header', () => {
    const { getByTestId } = render(<EarningsTab />);

    fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.BREAKDOWN_HEADER));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_FLOW, {
      screen: Routes.REWARDS_PERFORMANCE_VIEW,
      params: undefined,
    });
  });

  it('opens the invited performance view without referrals', () => {
    const { getByTestId } = render(<EarningsTab hideReferrals />);

    fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.BREAKDOWN_HEADER));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_FLOW, {
      screen: Routes.REWARDS_PERFORMANCE_VIEW,
      params: { hideReferrals: true },
    });
  });
});
