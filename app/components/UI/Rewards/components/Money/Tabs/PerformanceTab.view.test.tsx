/**
 * Performance tab through the real funnel, ledger, and commissions reads.
 *
 * yarn jest -c jest.config.view.js app/components/UI/Rewards/components/Money/Tabs/PerformanceTab.view.test.tsx --runInBand --coverage=false
 */
import '../../../../../../../tests/component-view/mocks';
import { act, fireEvent, waitFor, within } from '@testing-library/react-native';
import Routes from '../../../../../../constants/navigation/Routes';
import { PERFORMANCE_ACTIVITY_TEST_IDS } from '../PerformanceActivityRows.testIds';
import { TRADING_ACTIVITY_LIST_SKELETON_TEST_IDS } from '../TradingActivityListSkeleton.testIds';
import { PERFORMANCE_TAB_TEST_IDS } from './PerformanceTab.testIds';
import { getRouteProbeTestId } from '../../../../../../../tests/component-view/render';
import { renderPerformanceTab } from '../../../../../../../tests/component-view/renderers/rewardsMoney';
import { REFERRER_FUNNEL_SUMMARY } from '../../../../../../../tests/component-view/presets/rewardsMoney';

function callsFor(engine: jest.Mock, action: string): unknown[][] {
  return engine.mock.calls.filter((call) => call[0] === action);
}

describe('PerformanceTab', () => {
  it('shows the referrer funnel and commissions, not rebates', async () => {
    const {
      findByText,
      getByTestId,
      getByText,
      queryByTestId,
      queryByText,
      engine,
    } = renderPerformanceTab({
      persona: 'referrer',
      summary: REFERRER_FUNNEL_SUMMARY,
    });

    expect(await findByText('Confirmed referrals')).toBeOnTheScreen();
    expect(getByTestId(PERFORMANCE_TAB_TEST_IDS.FUNNEL)).toBeOnTheScreen();
    expect(getByText('Fee-generating referrals')).toBeOnTheScreen();
    expect(getByText('People who confirmed your code')).toBeOnTheScreen();
    expect(getByText('Referrals that generated fees')).toBeOnTheScreen();
    expect(getByText('$41.75')).toBeOnTheScreen();
    expect(getByText('Eligible fees')).toBeOnTheScreen();
    expect(getByText('Updated daily')).toBeOnTheScreen();
    expect(getByText('12')).toBeOnTheScreen();
    expect(getByText('5')).toBeOnTheScreen();
    expect(queryByText('Last 30 days · Updated daily')).not.toBeOnTheScreen();
    expect(queryByText('Code uses')).not.toBeOnTheScreen();
    expect(queryByText('Active referrals')).not.toBeOnTheScreen();
    expect(getByTestId(PERFORMANCE_TAB_TEST_IDS.COMMISSIONS)).toBeOnTheScreen();
    expect(getByText('Trading commissions')).toBeOnTheScreen();
    expect(
      queryByTestId(PERFORMANCE_TAB_TEST_IDS.REBATES),
    ).not.toBeOnTheScreen();

    await waitFor(() => {
      expect(
        callsFor(engine, 'RewardsMoneyController:getReferralFunnel'),
      ).toEqual([
        ['RewardsMoneyController:getReferralFunnel', { forceFresh: undefined }],
      ]);
      expect(
        callsFor(engine, 'RewardsMoneyController:getCommissions'),
      ).toEqual(
        expect.arrayContaining([
          [
            'RewardsMoneyController:getCommissions',
            expect.objectContaining({ originType: 'SOCIAL_FOLLOW_TRADE' }),
          ],
        ]),
      );
    });
    expect(
      callsFor(engine, 'RewardsMoneyController:getEarningsLedger'),
    ).toHaveLength(0);
  });

  it('shows five rebate rows and commissions when the ledger returns eight', async () => {
    const { getAllByTestId, getByTestId, getByText, queryByTestId, engine } =
      renderPerformanceTab({ persona: 'referee' });

    await waitFor(() => {
      expect(
        getAllByTestId(
          new RegExp(`^${PERFORMANCE_ACTIVITY_TEST_IDS.REBATE_ROW}-`),
        ),
      ).toHaveLength(5);
    });
    const rebates = within(getByTestId(PERFORMANCE_TAB_TEST_IDS.REBATES));
    expect(rebates.getAllByText('Swaps volume')).toHaveLength(5);
    expect(rebates.getAllByText('+$1.00')).toHaveLength(5);
    expect(
      queryByTestId(`${PERFORMANCE_ACTIVITY_TEST_IDS.REBATE_ROW}-earn-5`),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(`${PERFORMANCE_TAB_TEST_IDS.REBATES_EMPTY}-action`),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(PERFORMANCE_TAB_TEST_IDS.FUNNEL),
    ).not.toBeOnTheScreen();
    expect(getByTestId(PERFORMANCE_TAB_TEST_IDS.COMMISSIONS)).toBeOnTheScreen();
    expect(getByText('Trading commissions')).toBeOnTheScreen();
    expect(
      callsFor(engine, 'RewardsMoneyController:getReferralFunnel'),
    ).toHaveLength(0);
    expect(
      callsFor(engine, 'RewardsMoneyController:getCommissions'),
    ).toEqual(
      expect.arrayContaining([
        [
          'RewardsMoneyController:getCommissions',
          expect.objectContaining({ originType: 'SOCIAL_FOLLOW_TRADE' }),
        ],
      ]),
    );
    expect(
      callsFor(engine, 'RewardsMoneyController:getEarningsLedger'),
    ).toEqual(
      expect.arrayContaining([
        [
          'RewardsMoneyController:getEarningsLedger',
          expect.objectContaining({ includeClaims: false }),
        ],
      ]),
    );
  });

  it('shows the rebate skeleton while the first page is in flight', async () => {
    const { findByTestId, queryByTestId } = renderPerformanceTab({
      persona: 'referee',
      cashback: 'pending',
    });

    expect(
      await findByTestId(TRADING_ACTIVITY_LIST_SKELETON_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(`${PERFORMANCE_TAB_TEST_IDS.REBATES_EMPTY}-action`),
    ).not.toBeOnTheScreen();
  });

  it('shows the funnel skeleton while the funnel read is in flight', async () => {
    const { findByTestId, queryByTestId } = renderPerformanceTab({
      persona: 'referrer',
      summary: REFERRER_FUNNEL_SUMMARY,
      funnel: 'pending',
    });

    expect(
      await findByTestId(PERFORMANCE_TAB_TEST_IDS.FUNNEL_SKELETON),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(PERFORMANCE_TAB_TEST_IDS.FUNNEL),
    ).not.toBeOnTheScreen();
  });

  it('does not read funnel, commissions, or the ledger while another tab is selected', async () => {
    const { engine } = renderPerformanceTab({
      persona: 'referrer',
      summary: REFERRER_FUNNEL_SUMMARY,
      active: false,
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(
      callsFor(engine, 'RewardsMoneyController:getReferralFunnel'),
    ).toHaveLength(0);
    expect(
      callsFor(engine, 'RewardsMoneyController:getCommissions'),
    ).toHaveLength(0);
    expect(
      callsFor(engine, 'RewardsMoneyController:getEarningsLedger'),
    ).toHaveLength(0);
  });

  it('opens the rebates route from the section header', async () => {
    const { findByTestId } = renderPerformanceTab({
      persona: 'referee',
    });

    fireEvent.press(
      await findByTestId(PERFORMANCE_TAB_TEST_IDS.REBATES_HEADER),
    );

    expect(
      await findByTestId(
        getRouteProbeTestId(Routes.REWARDS_TRADING_REBATES_VIEW),
      ),
    ).toBeOnTheScreen();
  });
});
