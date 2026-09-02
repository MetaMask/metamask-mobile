import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import type {
  EarningOriginType,
  EarningsSummaryDto,
  EarningsSummaryTotals,
} from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { CLAIM_WATCHDOG_MS, REWARDS_MONEY_TEST_IDS } from '../../constants';
import useClaimEarnings, {
  ClaimError,
  type UseClaimEarningsResult,
} from '../hooks/useClaimEarnings';
import ClaimEarningsBottomSheet from './ClaimEarningsBottomSheet';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: jest.fn() }),
}));

jest.mock('../hooks/useClaimEarnings', () => {
  const actual = jest.requireActual('../hooks/useClaimEarnings');
  return {
    __esModule: true,
    ...actual,
    default: jest.fn(),
  };
});

const mockShowToast = jest.fn();
jest.mock('../../../Rewards/hooks/useRewardsToast', () => ({
  __esModule: true,
  default: () => ({
    showToast: mockShowToast,
    RewardsToastOptions: {
      success: (title: string) => ({ title }),
      error: (title: string, description?: string) => ({ title, description }),
    },
  }),
}));

const mockedUseClaimEarnings = jest.mocked(useClaimEarnings);

const createTotals = (
  overrides: Partial<EarningsSummaryTotals> = {},
): EarningsSummaryTotals => ({
  lifetime: '0',
  claimable: '0',
  pending: '0',
  claimed: '0',
  forfeited: '0',
  blocking_reason: null,
  ...overrides,
});

const createSummary = (
  overrides: Partial<EarningsSummaryDto> = {},
): EarningsSummaryDto => ({
  lifetime_total: '0',
  claimable: '12500000',
  pending: '0',
  claimed: '0',
  forfeited: '0',
  minimum_musd_base_units: '10000000',
  by_earning_origin_type: {
    CASHBACK: createTotals({ claimable: '12500000' }),
    REFERRAL_REV_SHARE: createTotals({ claimable: '12500000' }),
  },
  ...overrides,
});

const BOTH_TYPES: EarningOriginType[] = ['CASHBACK', 'REFERRAL_REV_SHARE'];

const createClaimState = (
  overrides: Partial<UseClaimEarningsResult> = {},
): UseClaimEarningsResult => ({
  claim: jest.fn(),
  isClaiming: false,
  hasSubmitted: false,
  error: null,
  isSubmittable: true,
  reset: jest.fn(),
  ...overrides,
});

const renderSheet = (
  summary: EarningsSummaryDto = createSummary(),
  originTypes: EarningOriginType[] = BOTH_TYPES,
) =>
  render(
    <ClaimEarningsBottomSheet route={{ params: { summary, originTypes } }} />,
  );

describe('ClaimEarningsBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    mockedUseClaimEarnings.mockReturnValue(createClaimState());
  });

  it('renders the same claimable amount the earnings screen shows', () => {
    renderSheet();

    expect(
      screen.getByTestId(REWARDS_MONEY_TEST_IDS.CLAIM_SHEET_AMOUNT),
    ).toHaveTextContent('12.50');
  });

  it('starts the claim for only the types that pay', () => {
    const claim = jest.fn();
    mockedUseClaimEarnings.mockReturnValue(createClaimState({ claim }));
    const summary = createSummary({
      by_earning_origin_type: {
        CASHBACK: createTotals({ claimable: '12500000' }),
        REFERRAL_REV_SHARE: createTotals({
          claimable: '0',
          blocking_reason: 'TAX_DETERMINATION_REQUIRED',
        }),
      },
    });
    renderSheet(summary);

    fireEvent.press(
      screen.getByTestId(REWARDS_MONEY_TEST_IDS.CLAIM_SHEET_CONFIRM),
    );

    expect(claim).toHaveBeenCalledWith(['CASHBACK']);
  });

  it('says plainly that the rest is held when only part of the scope pays', () => {
    const summary = createSummary({
      by_earning_origin_type: {
        CASHBACK: createTotals({ claimable: '12500000' }),
        REFERRAL_REV_SHARE: createTotals({
          claimable: '0',
          blocking_reason: 'TAX_DETERMINATION_REQUIRED',
        }),
      },
    });

    renderSheet(summary);

    expect(
      screen.getByTestId(REWARDS_MONEY_TEST_IDS.CLAIM_SHEET_PARTIAL_NOTICE),
    ).toBeOnTheScreen();
  });

  it('omits the partial notice when every requested type pays', () => {
    renderSheet();

    expect(
      screen.queryByTestId(REWARDS_MONEY_TEST_IDS.CLAIM_SHEET_PARTIAL_NOTICE),
    ).not.toBeOnTheScreen();
  });

  it('disables the CTA and explains why when the total is below the minimum', () => {
    const summary = createSummary({
      claimable: '5000000',
      by_earning_origin_type: {
        CASHBACK: createTotals({ claimable: '5000000' }),
        REFERRAL_REV_SHARE: createTotals({ claimable: '0' }),
      },
    });

    renderSheet(summary);

    expect(
      screen.getByTestId(REWARDS_MONEY_TEST_IDS.CLAIM_SHEET_BLOCKED_NOTICE),
    ).toHaveTextContent(strings('rewards_money.claim.blocked_below_minimum'));
    expect(
      screen.getByTestId(REWARDS_MONEY_TEST_IDS.CLAIM_SHEET_CONFIRM),
    ).toBeDisabled();
  });

  it('disables the CTA when the account cannot submit at all', () => {
    mockedUseClaimEarnings.mockReturnValue(
      createClaimState({ isSubmittable: false }),
    );

    renderSheet();

    expect(
      screen.getByTestId(REWARDS_MONEY_TEST_IDS.CLAIM_SHEET_CONFIRM),
    ).toBeDisabled();
  });

  it('surfaces an error toast without closing the sheet when the claim fails', () => {
    mockedUseClaimEarnings.mockReturnValue(
      createClaimState({
        error: new ClaimError('VOUCHER_EXPIRED', 'expired'),
      }),
    );

    renderSheet();

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        description: strings('rewards_money.claim.error_voucher_expired'),
      }),
    );
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('shows a success toast and closes the sheet once the batch is submitted', () => {
    mockedUseClaimEarnings.mockReturnValue(
      createClaimState({ hasSubmitted: true }),
    );

    renderSheet();

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: strings('rewards_money.claim.success'),
      }),
    );
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('re-enables dismissal when the watchdog fires with no response', () => {
    jest.useFakeTimers();
    renderSheet();
    fireEvent.press(
      screen.getByTestId(REWARDS_MONEY_TEST_IDS.CLAIM_SHEET_CONFIRM),
    );

    act(() => {
      jest.advanceTimersByTime(CLAIM_WATCHDOG_MS);
    });

    expect(
      screen.getByTestId(REWARDS_MONEY_TEST_IDS.CLAIM_SHEET),
    ).toBeOnTheScreen();
  });
});
