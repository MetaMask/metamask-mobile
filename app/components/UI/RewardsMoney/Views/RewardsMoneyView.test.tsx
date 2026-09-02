import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import type { ReferralMeDto } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import { REWARDS_MONEY_TEST_IDS } from '../constants';
import useRewardsMoneyMe from '../hooks/useRewardsMoneyMe';
import RewardsMoneyView from './RewardsMoneyView';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: jest.fn() }),
  useRoute: () => ({ params: {} }),
}));

jest.mock('../hooks/useRewardsMoneyMe', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../Views/ErrorBoundary', () => {
  const ReactActual = jest.requireActual('react');
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(ReactActual.Fragment, null, children),
  };
});

jest.mock('../referral-program/Views/RewardsMoneyReferralView', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(View, { testID: 'referral-variant' }),
  };
});

jest.mock('../earnings/Views/RewardsMoneyEarningsView', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ originTypes }: { originTypes?: string[] }) =>
      ReactActual.createElement(View, {
        testID: `earnings-variant-${(originTypes ?? []).join('+')}`,
      }),
  };
});

const mockedUseMe = jest.mocked(useRewardsMoneyMe);

const createMe = (overrides: Partial<ReferralMeDto> = {}): ReferralMeDto => ({
  role: 'REFERRER',
  variant: 'REFERRER',
  user_type: 'KOL',
  status: 'ACTIVE',
  referral_code: null,
  referred_by: null,
  earn_rates: {
    revshare_rate_bps: 2500,
    cashback_rate_bps: 50,
    earning_term_days: 90,
  },
  ...overrides,
});

const mockMeState = (overrides = {}) => {
  mockedUseMe.mockReturnValue({
    me: createMe(),
    isLoading: false,
    error: null,
    refresh: jest.fn(),
    ...overrides,
  });
};

describe('RewardsMoneyView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMeState();
  });

  it('renders a spinner while the bootstrap read is in flight', () => {
    mockMeState({ me: null, isLoading: true });

    render(<RewardsMoneyView />);

    expect(
      screen.getByTestId(REWARDS_MONEY_TEST_IDS.LOADING),
    ).toBeOnTheScreen();
  });

  it('renders the referrer screen for the REFERRER variant', () => {
    mockMeState({ me: createMe({ variant: 'REFERRER' }) });

    render(<RewardsMoneyView />);

    expect(screen.getByTestId('referral-variant')).toBeOnTheScreen();
  });

  it('renders the earnings screen scoped to cashback for the REFEREE variant', () => {
    mockMeState({ me: createMe({ role: 'REFEREE', variant: 'REFEREE' }) });

    render(<RewardsMoneyView />);

    expect(screen.getByTestId('earnings-variant-CASHBACK')).toBeOnTheScreen();
  });

  it('follows the server variant rather than the role for a BOTH user', () => {
    mockMeState({ me: createMe({ role: 'BOTH', variant: 'REFERRER' }) });

    render(<RewardsMoneyView />);

    expect(screen.getByTestId('referral-variant')).toBeOnTheScreen();
  });

  it('renders the entry state for a never-referred user', () => {
    mockMeState({ me: createMe({ role: 'NONE', variant: 'NONE' }) });

    render(<RewardsMoneyView />);

    expect(
      screen.getByTestId(REWARDS_MONEY_TEST_IDS.ENTRY_STATE),
    ).toBeOnTheScreen();
  });

  it('renders an error banner when the bootstrap read fails', () => {
    mockMeState({ me: null, error: 'Network down' });

    render(<RewardsMoneyView />);

    expect(screen.getByTestId(REWARDS_MONEY_TEST_IDS.ERROR)).toBeOnTheScreen();
  });

  it('retries the bootstrap read when the error banner CTA is pressed', () => {
    const refresh = jest.fn();
    mockMeState({ me: null, error: 'Network down', refresh });
    render(<RewardsMoneyView />);

    fireEvent.press(screen.getByText(strings('rewards_money.retry')));

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('goes back when the header back button is pressed', () => {
    render(<RewardsMoneyView />);

    fireEvent.press(screen.getByTestId('rewards-money-back-button'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
