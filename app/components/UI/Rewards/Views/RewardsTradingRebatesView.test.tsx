import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import type { LedgerEarningEntryDto } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import {
  CLAIMABLE_EARNINGS_SUMMARY,
  REFERRAL_LOCALIZED_TEXT as LOCALIZED_TEXT,
} from '../../../../../tests/component-view/presets/rewardsMoney';
import ExtendedKeyringTypes from '../../../../constants/keyringTypes';
import Routes from '../../../../constants/navigation/Routes';
import { useCashbackLedger } from '../hooks/useCashbackLedger';
import { PERFORMANCE_ACTIVITY_TEST_IDS } from '../components/Money/PerformanceActivityRows.testIds';
import { EARN_ACTION_HEADER_TEST_IDS } from '../components/Money/EarnActionHeader.testIds';
import { EARN_FAMILY_EARNINGS_TEST_IDS } from '../components/Money/EarnFamilyEarningsSection.testIds';
import { TRADING_ACTIVITY_LIST_EMPTY_TEST_ID } from '../components/Money/TradingActivityListView';
import RewardsTradingRebatesView, {
  REWARDS_TRADING_REBATES_VIEW_TEST_IDS,
} from './RewardsTradingRebatesView';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
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

jest.mock('../hooks/useCashbackLedger');
jest.mock('../hooks/useEarningsSummary', () => ({
  useEarningsSummary: () => ({ fetchEarningsSummary: jest.fn() }),
}));

const PROFILE_ID = 'profile-a';
const KEYRING_ID = 'entropy-source-1';
const REBATE: LedgerEarningEntryDto = {
  type: 'earning',
  id: 'e1',
  earning_origin_type: 'PERPS_FEE_CASHBACK',
  musd_amount: '1000000',
  voided_musd_amount: '0',
  fee_amount_usd: '1',
  entry_count: 1,
  transaction_hash: null,
  chain_id: null,
  ledger_timestamp: '2026-09-01T12:00:00.000Z',
  claim_status: 'unclaimed',
  claimable_at: '2026-09-02T00:00:00.000Z',
  swaps_source: null,
  perps_source: { coin: 'BTC', trade_id: 't1', tx_hash: null },
  predict_source: null,
};

const STATE = {
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
        data: { localized_text: LOCALIZED_TEXT },
      },
    },
    earningsSummary: {
      [PROFILE_ID]: {
        loading: false,
        error: false,
        data: CLAIMABLE_EARNINGS_SUMMARY,
      },
    },
  },
};

describe('RewardsTradingRebatesView', () => {
  const loadMore = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useCashbackLedger as jest.Mock).mockReturnValue({
      items: [REBATE],
      isLoading: false,
      isLoadingMore: false,
      hasMore: true,
      error: null,
      loadMore,
      refresh: jest.fn(),
      retry: jest.fn(),
      isRefreshing: false,
    });
  });

  it('lists the session profile’s rebates under the localized title', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <RewardsTradingRebatesView />,
      { state: STATE },
    );

    expect(useCashbackLedger).toHaveBeenCalledWith(PROFILE_ID);
    expect(
      getByTestId(REWARDS_TRADING_REBATES_VIEW_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(getByText('Trading rebates')).toBeOnTheScreen();
    expect(getByText('Perps')).toBeOnTheScreen();
    expect(getByText('+$1.00')).toBeOnTheScreen();
    expect(
      getByTestId(`${PERFORMANCE_ACTIVITY_TEST_IDS.REBATE_ROW}-${REBATE.id}`),
    ).toBeOnTheScreen();

    fireEvent(
      getByTestId(REWARDS_TRADING_REBATES_VIEW_TEST_IDS.LIST),
      'endReached',
    );

    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it('shows the benefit title, description and earnings above the rebates', () => {
    const { getByTestId } = renderWithProvider(<RewardsTradingRebatesView />, {
      state: STATE,
    });

    expect(getByTestId(EARN_ACTION_HEADER_TEST_IDS.TITLE)).toHaveTextContent(
      LOCALIZED_TEXT.invitedBenefitTitle,
    );
    expect(
      getByTestId(EARN_ACTION_HEADER_TEST_IDS.DESCRIPTION),
    ).toHaveTextContent(LOCALIZED_TEXT.invitedBenefitDescription);
    expect(
      getByTestId(EARN_FAMILY_EARNINGS_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('opens the trade tray from the header action', () => {
    const { getByTestId } = renderWithProvider(<RewardsTradingRebatesView />, {
      state: STATE,
    });

    fireEvent.press(getByTestId(EARN_ACTION_HEADER_TEST_IDS.CTA));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.TRADE_WALLET_ACTIONS,
    });
  });

  it('keeps the empty state description when there are no rebates', () => {
    (useCashbackLedger as jest.Mock).mockReturnValue({
      items: [],
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      error: null,
      loadMore,
      refresh: jest.fn(),
      retry: jest.fn(),
      isRefreshing: false,
    });

    const { getByTestId } = renderWithProvider(<RewardsTradingRebatesView />, {
      state: STATE,
    });

    expect(getByTestId(TRADING_ACTIVITY_LIST_EMPTY_TEST_ID)).toBeOnTheScreen();
  });

  it('renders no rows until localized text is available', () => {
    const { queryByTestId } = renderWithProvider(
      <RewardsTradingRebatesView />,
      {
        state: {
          ...STATE,
          rewardsMoney: {
            referralMe: {
              [PROFILE_ID]: { loading: false, error: false, data: null },
            },
          },
        },
      },
    );

    expect(
      queryByTestId(`${PERFORMANCE_ACTIVITY_TEST_IDS.REBATE_ROW}-${REBATE.id}`),
    ).toBeNull();
  });
});
