import React from 'react';
import { FlatList } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import type {
  LedgerClaimEntryDto,
  LedgerEntryDto,
  ReferralLocalizedText,
} from '../../../../core/Engine/controllers/rewards-money-controller/types';
import ExtendedKeyringTypes from '../../../../constants/keyringTypes';
import Routes from '../../../../constants/navigation/Routes';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { TRADING_ACTIVITY_LIST_EMPTY_TEST_ID } from '../components/Money/TradingActivityListView';
import { useEarningsHistory } from '../hooks/useEarningsHistory';
import { EARNINGS_HISTORY_TEST_IDS } from '../components/Money/EarningsHistoryRows';
import RewardsEarningsHistoryView, {
  REWARDS_EARNINGS_HISTORY_VIEW_TEST_IDS,
} from './RewardsEarningsHistoryView';

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

jest.mock('../hooks/useEarningsHistory');

const PROFILE_ID = 'profile-a';
const KEYRING_ID = 'entropy-source-1';
const LOCALIZED_TEXT = {
  history: 'History',
  historyReferrals: 'Referral earning',
  historyCommission: 'Commission',
  historyRebate: 'Rebate',
  historyClaimed: 'Claimed',
  tradingActivityEmptyDescription:
    'Your activity is empty now. Start trading to earn today!',
  tradingActivityEmptyAction: 'Start trading',
} as unknown as ReferralLocalizedText;

const earning: LedgerEntryDto = {
  type: 'earning',
  id: 'earn-1',
  earning_origin_type: 'SWAPS_FEE_CASHBACK',
  musd_amount: '1000000',
  voided_musd_amount: '0',
  fee_amount_usd: '1',
  entry_count: 1,
  transaction_hash: null,
  chain_id: null,
  ledger_timestamp: '2026-09-01T00:00:00.000Z',
  claim_status: 'unclaimed',
  claimable_at: '2026-09-02T00:00:00.000Z',
  swaps_source: null,
  perps_source: null,
  predict_source: null,
};

const claim: LedgerClaimEntryDto = {
  type: 'claim',
  id: earning.id,
  route: 'REFERRAL_REV_SHARE',
  gross_amount: '1000000',
  net_amount: '1000000',
  withholding_rate_bps: 0,
  status: 'SETTLED',
  ledger_timestamp: '2026-09-02T00:00:00.000Z',
  settled_at: '2026-09-02T00:00:00.000Z',
  payout_method: 'VOUCHER',
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
  },
};

describe('RewardsEarningsHistoryView', () => {
  const loadMore = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useEarningsHistory as jest.Mock).mockReturnValue({
      items: [earning],
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

  it('lists the unified feed under the localized history title', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <RewardsEarningsHistoryView />,
      { state: STATE },
    );

    expect(useEarningsHistory).toHaveBeenCalledWith(PROFILE_ID);
    expect(
      getByTestId(REWARDS_EARNINGS_HISTORY_VIEW_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(getByText('History')).toBeOnTheScreen();
    expect(getByText('Rebate')).toBeOnTheScreen();
    expect(getByText('+$1.00')).toBeOnTheScreen();
    expect(
      getByTestId(`${EARNINGS_HISTORY_TEST_IDS.ROW}-${earning.id}`),
    ).toBeOnTheScreen();

    fireEvent(
      getByTestId(REWARDS_EARNINGS_HISTORY_VIEW_TEST_IDS.LIST),
      'endReached',
    );

    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it('keys an earning and a claim that share an id apart', () => {
    (useEarningsHistory as jest.Mock).mockReturnValue({
      items: [earning, claim],
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      error: null,
      loadMore,
      refresh: jest.fn(),
      retry: jest.fn(),
      isRefreshing: false,
    });

    const { UNSAFE_getByType } = renderWithProvider(
      <RewardsEarningsHistoryView />,
      { state: STATE },
    );
    const { keyExtractor } = UNSAFE_getByType(FlatList).props;

    expect(keyExtractor(earning)).toBe(`earning-${earning.id}`);
    expect(keyExtractor(claim)).toBe(`claim-${earning.id}`);
  });

  it('opens the trade tray from the empty history action', () => {
    (useEarningsHistory as jest.Mock).mockReturnValue({
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

    const { getByTestId, getByText } = renderWithProvider(
      <RewardsEarningsHistoryView />,
      { state: STATE },
    );

    expect(
      getByText('Your activity is empty now. Start trading to earn today!'),
    ).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(`${TRADING_ACTIVITY_LIST_EMPTY_TEST_ID}-action`),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.TRADE_WALLET_ACTIONS,
    });
  });
});
