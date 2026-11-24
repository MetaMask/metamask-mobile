/**
 * Your earnings breakdown on the Earnings tab through the real summary selectors.
 *
 * yarn jest -c jest.config.view.js app/components/UI/Rewards/components/Money/Tabs/EarningsTab.view.test.tsx --runInBand --coverage=false
 */
import '../../../../../../../tests/component-view/mocks';
import { IconName } from '@metamask/design-system-react-native';
import { lightTheme } from '@metamask/design-tokens';
import { renderEarningsTab } from '../../../../../../../tests/component-view/renderers/rewardsMoney';
import {
  earningsSummaryFixture,
  referralMeFixture,
  REFERRAL_LOCALIZED_TEXT,
} from '../../../../../../../tests/component-view/presets/rewardsMoney';
import { avatarIconNameIn } from '../testUtils';
import { EARN_ACTION_SECTION_TEST_IDS } from './EarnActionSection.testIds';
import { EARNINGS_TAB_TEST_IDS } from './EarningsTab.testIds';

/** Resolved `text-success-default` in the light theme the view tests render in. */
const SUCCESS_DEFAULT_LIGHT = lightTheme.colors.success.default;

/** $41.75 of referrals, $9.15 of trading commissions and $7.65 of own cashback. */
const BREAKDOWN_SUMMARY = earningsSummaryFixture({
  lifetimeTotal: '58500000',
  revShareLifetime: '41750000',
  followTradeClaimable: '9150000',
});

function refereeWithRoles(roles: string[]) {
  return {
    ...referralMeFixture('referee'),
    roles,
  } as ReturnType<typeof referralMeFixture>;
}

describe('EarningsTab', () => {
  it('titles the section with the Your earnings copy and does not navigate from it', async () => {
    const { findByTestId, getByText, queryByRole } = renderEarningsTab({
      persona: 'referrer',
      summary: BREAKDOWN_SUMMARY,
    });

    expect(
      await findByTestId(EARNINGS_TAB_TEST_IDS.BREAKDOWN_HEADER),
    ).toBeOnTheScreen();
    expect(getByText(REFERRAL_LOCALIZED_TEXT.yourEarnings)).toBeOnTheScreen();
    expect(
      queryByRole('button', { name: 'Your earnings' }),
    ).not.toBeOnTheScreen();
  });

  it('falls back to the breakdown title when the payload has no Your earnings key', async () => {
    const referralMe = referralMeFixture('referrer');
    const { yourEarnings: _omitted, ...localizedText } =
      referralMe.localized_text;
    const { findByText, queryByText } = renderEarningsTab({
      persona: 'referrer',
      summary: BREAKDOWN_SUMMARY,
      referralMe: {
        ...referralMe,
        localized_text: localizedText as typeof referralMe.localized_text,
      },
    });

    expect(
      await findByText(REFERRAL_LOCALIZED_TEXT.breakdown),
    ).toBeOnTheScreen();
    expect(
      queryByText(REFERRAL_LOCALIZED_TEXT.yourEarnings),
    ).not.toBeOnTheScreen();
  });

  it('lists referrals and trading commissions for a referrer in success color', async () => {
    const { findByTestId, getByTestId, getByText, queryByTestId } =
      renderEarningsTab({
        persona: 'referrer',
        summary: BREAKDOWN_SUMMARY,
      });

    expect(
      await findByTestId(EARNINGS_TAB_TEST_IDS.BREAKDOWN),
    ).toBeOnTheScreen();
    expect(
      getByTestId(`${EARNINGS_TAB_TEST_IDS.BREAKDOWN_ROW}-referrals`),
    ).toBeOnTheScreen();
    expect(
      getByTestId(`${EARNINGS_TAB_TEST_IDS.BREAKDOWN_ROW}-social`),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(`${EARNINGS_TAB_TEST_IDS.BREAKDOWN_ROW}-trading`),
    ).not.toBeOnTheScreen();
    expect(getByText(REFERRAL_LOCALIZED_TEXT.referrals)).toBeOnTheScreen();
    expect(
      getByText(REFERRAL_LOCALIZED_TEXT.tradingCommissionsSection),
    ).toBeOnTheScreen();
    expect(
      avatarIconNameIn(
        getByTestId(`${EARNINGS_TAB_TEST_IDS.BREAKDOWN_ROW}-social`),
      ),
    ).toBe(IconName.People);
    expect(getByText('$41.75')).toHaveStyle({
      color: SUCCESS_DEFAULT_LIGHT,
    });
    expect(getByText('$9.15')).toHaveStyle({ color: SUCCESS_DEFAULT_LIGHT });
  });

  it('lists trading and trading commissions for a referee holding both roles', async () => {
    const { findByTestId, getByTestId, getByText, queryByText } =
      renderEarningsTab({
        persona: 'referee',
        summary: BREAKDOWN_SUMMARY,
      });

    expect(
      await findByTestId(EARNINGS_TAB_TEST_IDS.BREAKDOWN),
    ).toBeOnTheScreen();
    expect(
      getByTestId(`${EARNINGS_TAB_TEST_IDS.BREAKDOWN_ROW}-trading`),
    ).toBeOnTheScreen();
    expect(
      getByTestId(`${EARNINGS_TAB_TEST_IDS.BREAKDOWN_ROW}-social`),
    ).toBeOnTheScreen();
    expect(
      avatarIconNameIn(
        getByTestId(`${EARNINGS_TAB_TEST_IDS.BREAKDOWN_ROW}-trading`),
      ),
    ).toBe(IconName.SwapVertical);
    expect(getByText('$7.65')).toHaveStyle({ color: SUCCESS_DEFAULT_LIGHT });
    expect(
      queryByText(REFERRAL_LOCALIZED_TEXT.referrals),
    ).not.toBeOnTheScreen();
  });

  it.each([
    ['CASHBACK_EXPERIMENT', 'trading', 'social'],
    ['COPY_TRADING', 'social', 'trading'],
  ])(
    'shows only the matching row for a referee with only the %s role',
    async (role, shown, hidden) => {
      const { findByTestId, getByTestId, queryByTestId } = renderEarningsTab({
        persona: 'referee',
        summary: BREAKDOWN_SUMMARY,
        referralMe: refereeWithRoles([role]),
      });

      expect(
        await findByTestId(EARNINGS_TAB_TEST_IDS.BREAKDOWN),
      ).toBeOnTheScreen();
      expect(
        getByTestId(`${EARNINGS_TAB_TEST_IDS.BREAKDOWN_ROW}-${shown}`),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(`${EARNINGS_TAB_TEST_IDS.BREAKDOWN_ROW}-${hidden}`),
      ).not.toBeOnTheScreen();
    },
  );

  it('shows both rows for a referee with the cashback and copy-trading roles', async () => {
    const { findByTestId, getByTestId } = renderEarningsTab({
      persona: 'referee',
      summary: BREAKDOWN_SUMMARY,
      referralMe: refereeWithRoles(['CASHBACK_EXPERIMENT', 'COPY_TRADING']),
    });

    expect(
      await findByTestId(EARNINGS_TAB_TEST_IDS.BREAKDOWN),
    ).toBeOnTheScreen();
    expect(
      getByTestId(`${EARNINGS_TAB_TEST_IDS.BREAKDOWN_ROW}-trading`),
    ).toBeOnTheScreen();
    expect(
      getByTestId(`${EARNINGS_TAB_TEST_IDS.BREAKDOWN_ROW}-social`),
    ).toBeOnTheScreen();
  });

  it('keeps only the referrals row for a referrer while Social V1 is off', async () => {
    const { findByTestId, getByTestId, queryByTestId } = renderEarningsTab({
      persona: 'referrer',
      summary: BREAKDOWN_SUMMARY,
      socialV1: false,
    });

    expect(
      await findByTestId(EARNINGS_TAB_TEST_IDS.BREAKDOWN),
    ).toBeOnTheScreen();
    expect(
      getByTestId(`${EARNINGS_TAB_TEST_IDS.BREAKDOWN_ROW}-referrals`),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(`${EARNINGS_TAB_TEST_IDS.BREAKDOWN_ROW}-social`),
    ).not.toBeOnTheScreen();
  });

  it('omits the section for a plain persona', async () => {
    const { findByTestId, queryByTestId } = renderEarningsTab({
      persona: 'plain',
      summary: BREAKDOWN_SUMMARY,
    });

    expect(
      await findByTestId(EARNINGS_TAB_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(EARNINGS_TAB_TEST_IDS.BREAKDOWN),
    ).not.toBeOnTheScreen();
  });

  it('shows Ways to earn alongside Your earnings', async () => {
    const { findByTestId, getByTestId, getByText } = renderEarningsTab({
      persona: 'referrer',
      summary: BREAKDOWN_SUMMARY,
    });

    expect(
      await findByTestId(EARN_ACTION_SECTION_TEST_IDS.WAYS_TO_EARN),
    ).toBeOnTheScreen();
    expect(getByText(REFERRAL_LOCALIZED_TEXT.waysToEarn)).toBeOnTheScreen();
    expect(
      getByTestId(EARN_ACTION_SECTION_TEST_IDS.WAYS_TO_EARN_HEADER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(`${EARN_ACTION_SECTION_TEST_IDS.WAYS_TO_EARN_ROW}-referrals`),
    ).toBeOnTheScreen();
    expect(
      getByTestId(EARNINGS_TAB_TEST_IDS.BREAKDOWN_HEADER),
    ).toBeOnTheScreen();
  });
});
