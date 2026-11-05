/**
 * Rewards Money dashboard through the shared preset.
 *
 * Absorbs the earnings-history journey from #37974.
 *
 * yarn jest -c jest.config.view.js app/components/UI/Rewards/Views/RewardsMoneyDashboard.view.test.tsx --runInBand --coverage=false
 */
import '../../../../../tests/component-view/mocks';
import { fireEvent, waitFor, within } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { RewardsMoneyHttpError } from '../../../../core/Engine/controllers/rewards-money-controller/services/rewards-money-data-service';
import { REWARDS_MONEY_DASHBOARD_TEST_IDS } from './RewardsMoneyDashboard.testIds';
import { CLAIMABLE_REWARDS_CARD_TEST_IDS } from '../components/Money/ClaimableRewardsCard.testIds';
import { EARNINGS_HISTORY_TEST_IDS } from '../components/Money/EarningsHistoryRows.testIds';
import { REFEREE_HERO_CARD_TEST_IDS } from '../components/Money/RefereeHeroCard.testIds';
import { EARNINGS_TAB_TEST_IDS } from '../components/Money/Tabs/EarningsTab.testIds';
import { getRouteProbeTestId } from '../../../../../tests/component-view/render';
import { FLOATING_HEADER_FADE_TEST_ID } from '../../../../component-library/components-temp/HeaderGlass/HeaderGlass';
import { renderRewardsMoneyDashboard } from '../../../../../tests/component-view/renderers/rewardsMoney';
import {
  CLAIMABLE_EARNINGS_SUMMARY,
  EARNINGS_HISTORY_ROW,
  referralMeFixture,
  REFERRAL_LOCALIZED_TEXT,
} from '../../../../../tests/component-view/presets/rewardsMoney';
import { formatMusdBaseUnits } from '../utils/formatUtils';
import { selfEarnedLifetime } from '../utils/earningsSummaryTotals';

function callsFor(engine: jest.Mock, action: string): unknown[][] {
  return engine.mock.calls.filter((call) => call[0] === action);
}

describe('RewardsMoneyDashboard', () => {
  it('opens the earnings history from a claimable referee summary', async () => {
    const { getByTestId, findByTestId, engine } = renderRewardsMoneyDashboard({
      persona: 'referee',
      summary: CLAIMABLE_EARNINGS_SUMMARY,
    });

    expect(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.EARNINGS_TAB_DOT),
    ).toBeOnTheScreen();

    fireEvent.press(getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.EARNINGS_TAB));

    expect(
      await findByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.EARNINGS_BODY),
    ).toBeOnTheScreen();
    expect(
      await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    ).toBeOnTheScreen();
    expect(
      await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.AMOUNT),
    ).toHaveTextContent('$5.00');
    const historyRow = await findByTestId(
      `${EARNINGS_HISTORY_TEST_IDS.ROW}-${EARNINGS_HISTORY_ROW.id}`,
    );
    expect(
      within(historyRow).getByText(REFERRAL_LOCALIZED_TEXT.historyRebate),
    ).toBeOnTheScreen();
    expect(within(historyRow).getByText('+$1.00')).toBeOnTheScreen();

    await waitFor(() => {
      const summaryCalls = callsFor(
        engine,
        'RewardsMoneyController:getEarningsSummary',
      );
      expect(
        summaryCalls.some((call) => !(call[1] as { from?: string })?.from),
      ).toBe(true);
      expect(
        summaryCalls.some((call) =>
          Boolean((call[1] as { from?: string })?.from),
        ),
      ).toBe(true);
      expect(
        callsFor(engine, 'RewardsMoneyController:getEarningsLedger'),
      ).toEqual(
        expect.arrayContaining([
          [
            'RewardsMoneyController:getEarningsLedger',
            expect.objectContaining({ includeClaims: true }),
          ],
        ]),
      );
    });

    fireEvent.press(getByTestId(EARNINGS_TAB_TEST_IDS.HISTORY_HEADER));

    expect(
      await findByTestId(
        getRouteProbeTestId(Routes.REWARDS_EARNINGS_HISTORY_VIEW),
      ),
    ).toBeOnTheScreen();
  });

  it('refetches the earnings summary once when Retry is pressed after a 503 (E4, RWDS-1674)', async () => {
    // Summary reads throw RewardsMoneyHttpError. A 503 with Retry-After 2 is
    // the data service's short busy refusal (`failure: 'UNAVAILABLE'` on the
    // quote error is the same status). No cached summary, or the banner stays hidden.
    let rejectSummary = true;
    const refereeRebateTotal = formatMusdBaseUnits(
      selfEarnedLifetime(
        CLAIMABLE_EARNINGS_SUMMARY,
        'REFERRAL_TRADE_FEE_CASHBACK',
      ),
    );
    if (!refereeRebateTotal) {
      throw new Error('Referee rebate total missing from the summary fixture');
    }
    const { findByTestId, findByText, queryByTestId, engine } =
      renderRewardsMoneyDashboard({
        persona: 'referee',
        summary: null,
        handlers: {
          'RewardsMoneyController:getEarningsSummary': () =>
            rejectSummary
              ? Promise.reject(
                  new RewardsMoneyHttpError(
                    'Get earnings summary failed: 503',
                    503,
                    JSON.stringify({ reason: 'SERVER_BUSY' }),
                    2,
                  ),
                )
              : Promise.resolve(CLAIMABLE_EARNINGS_SUMMARY),
        },
      });

    const banner = await findByTestId(
      REFEREE_HERO_CARD_TEST_IDS.EARNINGS_ERROR,
      {},
      { timeout: 3000 },
    );
    const summaryCallsBeforeRetry = callsFor(
      engine,
      'RewardsMoneyController:getEarningsSummary',
    ).length;
    const ledgerCallsBeforeRetry = callsFor(
      engine,
      'RewardsMoneyController:getEarningsLedger',
    ).length;

    rejectSummary = false;
    fireEvent.press(
      within(banner).getByText(
        strings('rewards.referral_details_error.retry_button'),
      ),
    );

    expect(
      await findByText(refereeRebateTotal, {}, { timeout: 3000 }),
    ).toBeOnTheScreen();
    await waitFor(() => {
      expect(
        callsFor(engine, 'RewardsMoneyController:getEarningsSummary'),
      ).toHaveLength(summaryCallsBeforeRetry + 1);
    });
    expect(
      callsFor(engine, 'RewardsMoneyController:getEarningsLedger'),
    ).toHaveLength(ledgerCallsBeforeRetry);
    expect(
      queryByTestId(REFEREE_HERO_CARD_TEST_IDS.EARNINGS_ERROR),
    ).not.toBeOnTheScreen();
  });
});

describe('RewardsMoneyDashboard settings', () => {
  const subscribed = { subscriptionId: 'sub-1' };

  async function openDashboard(
    options: Parameters<typeof renderRewardsMoneyDashboard>[0] = {},
  ) {
    const view = renderRewardsMoneyDashboard({
      persona: 'plain',
      moneyControllerEnabled: true,
      ...options,
    });
    expect(
      await view.findByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    return view;
  }

  it('opens settings from a cached referral when there is no subscription', async () => {
    const { getByTestId, findByTestId } = await openDashboard();

    fireEvent.press(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.SETTINGS_BUTTON),
    );

    expect(
      await findByTestId(getRouteProbeTestId(Routes.REWARDS_SETTINGS_VIEW)),
    ).toBeOnTheScreen();
  });

  it('hides settings without a subscription when the profile is a referrer', async () => {
    const { queryByTestId } = await openDashboard({ persona: 'referrer' });

    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.SETTINGS_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('hides settings without a subscription in an excluded region', async () => {
    const { queryByTestId } = await openDashboard({
      geoLocation: 'GB',
      referralMe: {
        ...referralMeFixture('plain'),
        excluded_regions: ['GB'],
      },
    });

    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.SETTINGS_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('opens settings when subscribed even if the profile is a referrer', async () => {
    const { getByTestId, findByTestId } = await openDashboard({
      ...subscribed,
      persona: 'referrer',
    });

    fireEvent.press(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.SETTINGS_BUTTON),
    );

    expect(
      await findByTestId(getRouteProbeTestId(Routes.REWARDS_SETTINGS_VIEW)),
    ).toBeOnTheScreen();
  });
});

describe('RewardsMoneyDashboard glass header', () => {
  it('floats the header over the content when glass headers are on', async () => {
    const { findByTestId, getByTestId } = renderRewardsMoneyDashboard({
      persona: 'plain',
      moneyControllerEnabled: true,
      subscriptionId: 'sub-1',
      glassHeaders: true,
    });

    expect(await findByTestId(FLOATING_HEADER_FADE_TEST_ID)).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.SETTINGS_BUTTON),
    );

    expect(
      await findByTestId(getRouteProbeTestId(Routes.REWARDS_SETTINGS_VIEW)),
    ).toBeOnTheScreen();
  });

  it('keeps the solid header when glass headers are off', async () => {
    const { findByTestId, queryByTestId } = renderRewardsMoneyDashboard({
      persona: 'plain',
      moneyControllerEnabled: true,
    });

    expect(
      await findByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(queryByTestId(FLOATING_HEADER_FADE_TEST_ID)).not.toBeOnTheScreen();
  });
});
