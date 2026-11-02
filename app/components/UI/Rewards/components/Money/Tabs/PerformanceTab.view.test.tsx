/**
 * Performance tab through the real cashback ledger hook.
 *
 * Run with:
 * yarn jest -c jest.config.view.js app/components/UI/Rewards/components/Money/Tabs/PerformanceTab.view.test.tsx --runInBand --silent --coverage=false
 */
import '../../../../../../../tests/component-view/mocks';
import React from 'react';
import { waitFor } from '@testing-library/react-native';
import Engine from '../../../../../../core/Engine';
import type { LedgerEarningEntryDto } from '../../../../../../core/Engine/controllers/rewards-money-controller/types';
import { renderComponentViewScreen } from '../../../../../../../tests/component-view/render';
import { createStateFixture } from '../../../../../../../tests/component-view/stateFixture';
import { TRADING_ACTIVITY_LIST_SKELETON_TEST_IDS } from '../TradingActivityListSkeleton';
import { PERFORMANCE_ACTIVITY_TEST_IDS } from '../PerformanceActivityRows';
import PerformanceTab, { PERFORMANCE_TAB_TEST_IDS } from './PerformanceTab';

const PROFILE_ID = 'profile-a';

const LOCALIZED_TEXT = {
  tradingRebates: 'Trading rebates',
  tradingActivityEmptyDescription:
    'Your activity is empty now. Start trading to earn today!',
  tradingActivityEmptyAction: 'Start trading',
  rebateSwaps: 'Swaps',
  rebatePerpsVolume: 'Perps volume',
};

function earningRow(index: number): LedgerEarningEntryDto {
  return {
    type: 'earning',
    id: `earn-${index}`,
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
}

function RefereePerformanceTab() {
  return <PerformanceTab profileId={PROFILE_ID} persona="referee" active />;
}

function renderRefereeTab() {
  const state = createStateFixture()
    .withMinimalAccounts()
    .withMinimalMainnetNetwork()
    .withOverrides({
      rewardsMoney: {
        referralMe: {
          [PROFILE_ID]: {
            loading: false,
            error: false,
            data: {
              localized_text: LOCALIZED_TEXT,
            },
          },
        },
        earningsSummary: {},
        referralFunnel: {},
        commissions: {},
        cashbackLedger: {},
      },
    })
    .build();

  return renderComponentViewScreen(
    RefereePerformanceTab as unknown as React.ComponentType,
    { name: 'PerformanceTab' },
    { state },
  );
}

describe('PerformanceTab', () => {
  const mockCall = Engine.controllerMessenger.call as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows five rebate rows when the ledger returns eight', async () => {
    mockCall.mockImplementation((action: string) => {
      if (action === 'RewardsMoneyController:getEarningsLedger') {
        return Promise.resolve({
          results: Array.from({ length: 8 }, (_, index) => earningRow(index)),
          has_more: false,
          cursor: null,
          window: null,
        });
      }
      return Promise.resolve(undefined);
    });

    const { getAllByTestId, queryByTestId } = renderRefereeTab();

    await waitFor(() => {
      expect(
        getAllByTestId(
          new RegExp(`^${PERFORMANCE_ACTIVITY_TEST_IDS.REBATE_ROW}-`),
        ),
      ).toHaveLength(5);
    });
    expect(
      queryByTestId(`${PERFORMANCE_ACTIVITY_TEST_IDS.REBATE_ROW}-earn-5`),
    ).toBeNull();
    expect(
      queryByTestId(`${PERFORMANCE_TAB_TEST_IDS.REBATES_EMPTY}-action`),
    ).toBeNull();
  });

  it('shows the rebate skeleton while the first page is in flight', async () => {
    mockCall.mockImplementation((action: string) => {
      if (action === 'RewardsMoneyController:getEarningsLedger') {
        return new Promise(() => undefined);
      }
      return Promise.resolve(undefined);
    });

    const { findByTestId, queryByTestId } = renderRefereeTab();

    expect(
      await findByTestId(TRADING_ACTIVITY_LIST_SKELETON_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(`${PERFORMANCE_TAB_TEST_IDS.REBATES_EMPTY}-action`),
    ).toBeNull();
  });
});
