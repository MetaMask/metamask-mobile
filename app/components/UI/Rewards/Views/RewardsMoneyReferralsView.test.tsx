import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import type { LedgerEarningEntryDto } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import ExtendedKeyringTypes from '../../../../constants/keyringTypes';
import {
  earningRow,
  earningsSummaryFixture,
  REFERRAL_LOCALIZED_TEXT as LOCALIZED_TEXT,
} from '../../../../../tests/component-view/presets/rewardsMoney';
import { useReferralEarningsLedger } from '../hooks/useReferralEarningsLedger';
import { EARN_ACTION_HEADER_TEST_IDS } from '../components/Money/EarnActionHeader.testIds';
import { EARN_FAMILY_EARNINGS_TEST_IDS } from '../components/Money/EarnFamilyEarningsSection.testIds';
import { SHARE_CODE_SHEET_TEST_IDS } from '../components/Money/ShareCodeSheet';
import RewardsMoneyReferralsView, {
  REWARDS_MONEY_REFERRALS_VIEW_TEST_IDS,
} from './RewardsMoneyReferralsView';

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  };
});

jest.mock('../../../Views/ErrorBoundary', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
  };
});

jest.mock('../hooks/useReferralEarningsLedger');
jest.mock('../hooks/useReferralFunnel', () => ({
  useReferralFunnel: () => ({ fetchReferralFunnel: jest.fn() }),
}));
jest.mock('../hooks/useEarningsSummary', () => ({
  useEarningsSummary: () => ({ fetchEarningsSummary: jest.fn() }),
}));

const PROFILE_ID = 'profile-a';
const KEYRING_ID = 'entropy-source-1';
const CODE = 'FRIEND123';

const EARNING = {
  ...earningRow(1),
  earning_origin_type: 'REFERRAL_REV_SHARE' as const,
};

const stateWith = ({
  codeStatus = 'ACTIVE',
  funnel = { enrolled: 7, earning_generating: 3 },
  funnelError = false,
  summary = earningsSummaryFixture({ revShareLifetime: '41750000' }),
  summaryError = false,
}: {
  codeStatus?: 'ACTIVE' | 'PAUSED';
  funnel?: { enrolled: number; earning_generating: number } | null;
  funnelError?: boolean;
  summary?: ReturnType<typeof earningsSummaryFixture> | null;
  summaryError?: boolean;
} = {}) => ({
  engine: {
    backgroundState: {
      AuthenticationController: {
        isSignedIn: true,
        srpSessionData: {
          [KEYRING_ID]: {
            profile: { profileId: PROFILE_ID },
          },
        },
      },
      KeyringController: {
        isUnlocked: true,
        keyrings: [
          {
            type: ExtendedKeyringTypes.hd,
            accounts: [],
            metadata: { id: KEYRING_ID, name: '' },
          },
        ],
      },
    },
  },
  rewardsMoney: {
    referralMe: {
      [PROFILE_ID]: {
        loading: false,
        error: false,
        data: {
          localized_text: LOCALIZED_TEXT,
          referral_code: {
            code: CODE,
            kind: 'REFERRER',
            status: codeStatus,
            share_url: `https://example.test/${CODE}`,
          },
          referral_code_status: codeStatus,
        },
      },
    },
    earningsSummary: {
      [PROFILE_ID]: {
        loading: false,
        error: summaryError,
        data: summary,
      },
    },
    referralFunnel: {
      [PROFILE_ID]: {
        loading: false,
        error: funnelError,
        data: funnel,
      },
    },
  },
});

const listResult = (items: LedgerEarningEntryDto[]) => ({
  items,
  isLoading: false,
  isLoadingMore: false,
  hasMore: false,
  error: null,
  loadMore: jest.fn(),
  refresh: jest.fn(),
  retry: jest.fn(),
  isRefreshing: false,
});

describe('RewardsMoneyReferralsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useReferralEarningsLedger as jest.Mock).mockReturnValue(
      listResult([EARNING]),
    );
  });

  it('shows the earn fees title and description above the earnings', () => {
    const { getByTestId } = renderWithProvider(<RewardsMoneyReferralsView />, {
      state: stateWith(),
    });

    expect(
      getByTestId(REWARDS_MONEY_REFERRALS_VIEW_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(getByTestId(EARN_ACTION_HEADER_TEST_IDS.TITLE)).toHaveTextContent(
      LOCALIZED_TEXT.earnEligibleFees,
    );
    expect(
      getByTestId(EARN_ACTION_HEADER_TEST_IDS.DESCRIPTION),
    ).toHaveTextContent(LOCALIZED_TEXT.earnEligibleFeesDescription);
    expect(useReferralEarningsLedger).toHaveBeenCalledWith(PROFILE_ID);
  });

  it('shows the referral code under the Share code button', () => {
    const { getByTestId } = renderWithProvider(<RewardsMoneyReferralsView />, {
      state: stateWith(),
    });

    expect(getByTestId(EARN_ACTION_HEADER_TEST_IDS.CTA)).toHaveTextContent(
      LOCALIZED_TEXT.shareCode,
    );
    expect(getByTestId(EARN_ACTION_HEADER_TEST_IDS.SUBTEXT)).toHaveTextContent(
      `${LOCALIZED_TEXT.inviteReferralCode} ${CODE}`,
    );
  });

  it('opens the share sheet from the Share code button', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <RewardsMoneyReferralsView />,
      { state: stateWith() },
    );
    expect(queryByTestId(SHARE_CODE_SHEET_TEST_IDS.CONTAINER)).toBeNull();

    fireEvent.press(getByTestId(EARN_ACTION_HEADER_TEST_IDS.CTA));

    expect(getByTestId(SHARE_CODE_SHEET_TEST_IDS.CONTAINER)).toBeOnTheScreen();
  });

  it('hides the button and the code while the code is not shareable', () => {
    const { queryByTestId } = renderWithProvider(
      <RewardsMoneyReferralsView />,
      { state: stateWith({ codeStatus: 'PAUSED' }) },
    );

    expect(queryByTestId(EARN_ACTION_HEADER_TEST_IDS.CTA)).toBeNull();
    expect(queryByTestId(EARN_ACTION_HEADER_TEST_IDS.SUBTEXT)).toBeNull();
  });

  it('adds the funnel counts to the earnings', () => {
    const { getByTestId } = renderWithProvider(<RewardsMoneyReferralsView />, {
      state: stateWith(),
    });

    expect(
      getByTestId(`${EARN_FAMILY_EARNINGS_TEST_IDS.ROW}-confirmed`),
    ).toHaveTextContent(LOCALIZED_TEXT.funnelConfirmed, { exact: false });
    expect(
      getByTestId(`${EARN_FAMILY_EARNINGS_TEST_IDS.ROW}-confirmed`),
    ).toHaveTextContent('7', { exact: false });
    expect(
      getByTestId(`${EARN_FAMILY_EARNINGS_TEST_IDS.ROW}-feeGenerating`),
    ).toHaveTextContent('3', { exact: false });
  });

  it('shows a dash for a funnel count that has not loaded', () => {
    const { getByTestId } = renderWithProvider(<RewardsMoneyReferralsView />, {
      state: stateWith({ funnel: null }),
    });

    expect(
      getByTestId(`${EARN_FAMILY_EARNINGS_TEST_IDS.ROW}-confirmed`),
    ).toHaveTextContent('—', { exact: false });
  });

  it('shows the funnel banner under the amounts when only the funnel failed', () => {
    const { getByTestId } = renderWithProvider(<RewardsMoneyReferralsView />, {
      state: stateWith({ funnel: null, funnelError: true }),
    });

    expect(getByTestId(EARN_FAMILY_EARNINGS_TEST_IDS.ERROR)).toHaveTextContent(
      strings('rewards.referral_details_error.error_fetching_title'),
      { exact: false },
    );
    expect(
      getByTestId(`${EARN_FAMILY_EARNINGS_TEST_IDS.ROW}-claimable`),
    ).toBeOnTheScreen();
  });

  it('shows the summary banner and dashes when both fetches failed', () => {
    const { getByTestId, queryByText } = renderWithProvider(
      <RewardsMoneyReferralsView />,
      {
        state: stateWith({
          funnel: null,
          funnelError: true,
          summary: null,
          summaryError: true,
        }),
      },
    );

    expect(getByTestId(EARN_FAMILY_EARNINGS_TEST_IDS.ERROR)).toHaveTextContent(
      strings('rewards.earnings_summary_error.error_fetching_title'),
      { exact: false },
    );
    expect(
      queryByText(
        strings('rewards.referral_details_error.error_fetching_title'),
      ),
    ).toBeNull();
    expect(
      getByTestId(`${EARN_FAMILY_EARNINGS_TEST_IDS.ROW}-claimable`),
    ).toHaveTextContent('—', { exact: false });
    expect(
      getByTestId(`${EARN_FAMILY_EARNINGS_TEST_IDS.ROW}-confirmed`),
    ).toHaveTextContent('—', { exact: false });
  });
});
