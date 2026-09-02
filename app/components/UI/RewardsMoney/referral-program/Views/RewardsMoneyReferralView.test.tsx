import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import type { ReferralMeDto } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { REFERRER_ORIGIN_TYPES, REWARDS_MONEY_TEST_IDS } from '../../constants';
import RewardsMoneyReferralView from './RewardsMoneyReferralView';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

const mockShowToast = jest.fn();
jest.mock('../../../Rewards/hooks/useRewardsToast', () => ({
  __esModule: true,
  default: () => ({
    showToast: mockShowToast,
    RewardsToastOptions: { success: (title: string) => ({ title }) },
  }),
}));

jest.mock('../../../../../core/ClipboardManager', () => ({
  __esModule: true,
  default: { setString: jest.fn().mockResolvedValue(undefined) },
}));

const createMe = (overrides: Partial<ReferralMeDto> = {}): ReferralMeDto => ({
  role: 'REFERRER',
  variant: 'REFERRER',
  user_type: 'KOL',
  status: 'ACTIVE',
  referral_code: {
    code: 'FOX123',
    kind: 'PRIMARY',
    status: 'ACTIVE',
    share_url: 'https://example.test/join?ref=FOX123',
  },
  referred_by: null,
  earn_rates: {
    revshare_rate_bps: 2500,
    cashback_rate_bps: 50,
    earning_term_days: 90,
  },
  ...overrides,
});

describe('RewardsMoneyReferralView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the code, the rates and the share button', () => {
    render(<RewardsMoneyReferralView me={createMe()} />);

    expect(
      screen.getByTestId(REWARDS_MONEY_TEST_IDS.REFERRAL_CODE_CARD),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(REWARDS_MONEY_TEST_IDS.REFERRAL_RATES_ROW),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(REWARDS_MONEY_TEST_IDS.SHARE_LINK_BUTTON),
    ).toBeOnTheScreen();
  });

  it('omits the code card when the user has no active code', () => {
    render(<RewardsMoneyReferralView me={createMe({ referral_code: null })} />);

    expect(
      screen.queryByTestId(REWARDS_MONEY_TEST_IDS.REFERRAL_CODE_CARD),
    ).not.toBeOnTheScreen();
  });

  it('omits the share button when the server supplies no share URL', () => {
    const me = createMe({
      referral_code: {
        code: 'FOX123',
        kind: 'PRIMARY',
        status: 'ACTIVE',
        share_url: null,
      },
    });

    render(<RewardsMoneyReferralView me={me} />);

    expect(
      screen.queryByTestId(REWARDS_MONEY_TEST_IDS.SHARE_LINK_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('opens the earnings screen scoped to both referrer origin types', () => {
    render(<RewardsMoneyReferralView me={createMe()} />);

    fireEvent.press(screen.getByTestId(REWARDS_MONEY_TEST_IDS.EARNINGS_CTA));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.REWARDS_FLOW,
      expect.objectContaining({
        screen: Routes.REWARDS_MONEY_EARNINGS_VIEW,
        params: { originTypes: REFERRER_ORIGIN_TYPES },
      }),
    );
  });

  it('confirms with a toast once the code is copied', async () => {
    render(<RewardsMoneyReferralView me={createMe()} />);

    fireEvent.press(screen.getByTestId('rewards-money-copy-code-button'));

    await screen.findByTestId(REWARDS_MONEY_TEST_IDS.REFERRAL_CODE_CARD);
    expect(mockShowToast).toHaveBeenCalledWith({
      title: strings('rewards_money.referral.code_copied'),
    });
  });
});
