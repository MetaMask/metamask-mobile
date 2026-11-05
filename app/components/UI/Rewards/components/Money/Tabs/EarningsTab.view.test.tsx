/**
 * Earnings claim states through the real summary, history, and claim hooks.
 *
 * yarn jest -c jest.config.view.js app/components/UI/Rewards/components/Money/Tabs/EarningsTab.view.test.tsx --runInBand --coverage=false
 */
import '../../../../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';
import Routes from '../../../../../../constants/navigation/Routes';
import { RewardsMoneyClaimRefusalError } from '../../../../../../core/Engine/controllers/rewards-money-controller/services/rewards-money-data-service';
import { CLAIMABLE_REWARDS_CARD_TEST_IDS } from '../ClaimableRewardsCard.testIds';
import { getRouteParamsProbeTestId } from '../../../../../../../tests/component-view/render';
import { renderEarningsTab } from '../../../../../../../tests/component-view/renderers/rewardsMoney';
import {
  CLAIMED_EARNINGS_SUMMARY,
  EXACT_DOLLAR_EARNINGS_SUMMARY,
  PAUSED_EARNINGS_SUMMARY,
  referralMeFixture,
  REFERRAL_LOCALIZED_TEXT,
  REFUSAL_REFRESH_SUMMARY,
  REWARDS_MONEY_ACCOUNT_ADDRESS,
} from '../../../../../../../tests/component-view/presets/rewardsMoney';

function callsFor(engine: jest.Mock, action: string): unknown[][] {
  return engine.mock.calls.filter((call) => call[0] === action);
}

describe('EarningsTab', () => {
  it('claims exactly $1 of referee cashback into the Money account', async () => {
    const { findByTestId, getByTestId, queryByTestId, engine } =
      renderEarningsTab({
        persona: 'referee',
        summary: EXACT_DOLLAR_EARNINGS_SUMMARY,
        claimReady: true,
        initiateClaim: 'hang',
      });

    expect(
      await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    ).toBeOnTheScreen();
    expect(
      await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.AMOUNT),
    ).toHaveTextContent('$1.00');
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.PAUSED_BUTTON),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIMED_BUTTON),
    ).not.toBeOnTheScreen();

    fireEvent.press(getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON));

    await waitFor(() => {
      expect(callsFor(engine, 'RewardsMoneyController:initiateClaim')).toEqual([
        [
          'RewardsMoneyController:initiateClaim',
          'referral-trade-fee-cashback',
          { money_account_address: REWARDS_MONEY_ACCOUNT_ADDRESS },
        ],
      ]);
    });
  });

  it('ignores a second tap while the first claim is still open', async () => {
    const { findByTestId, getByTestId, engine } = renderEarningsTab({
      persona: 'referee',
      summary: EXACT_DOLLAR_EARNINGS_SUMMARY,
      claimReady: true,
      initiateClaim: 'hang',
    });

    const claimButton = await findByTestId(
      CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON,
    );

    fireEvent.press(claimButton);
    fireEvent.press(claimButton);

    await waitFor(() => {
      expect(
        callsFor(engine, 'RewardsMoneyController:initiateClaim'),
      ).toHaveLength(1);
    });
  });

  it('does not offer Claim to a referrer who has exactly $1 of cashback', async () => {
    const { findByTestId, queryByTestId, engine } = renderEarningsTab({
      persona: 'referrer',
      summary: EXACT_DOLLAR_EARNINGS_SUMMARY,
      claimReady: true,
      initiateClaim: 'hang',
    });

    expect(
      await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.RECORDED),
    ).toHaveTextContent('$1.00');
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.AMOUNT),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.PAUSED_BUTTON),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIMED_BUTTON),
    ).not.toBeOnTheScreen();
    expect(
      callsFor(engine, 'RewardsMoneyController:initiateClaim'),
    ).toHaveLength(0);
  });

  it.each([
    {
      label: 'Monad vault',
      claimGates: { monadVault: false },
    },
    {
      label: 'gas sponsorship',
      claimGates: { gasSponsorship: false },
    },
    {
      label: 'Money account',
      claimGates: { moneyAccount: false },
    },
  ])('refuses a claim when the $label is missing', async ({ claimGates }) => {
    const { findByTestId, findByText, getByTestId, engine } = renderEarningsTab(
      {
        persona: 'referee',
        summary: EXACT_DOLLAR_EARNINGS_SUMMARY,
        claimReady: true,
        claimGates,
        initiateClaim: 'hang',
      },
    );

    fireEvent.press(
      await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    );

    expect(
      await findByText(REFERRAL_LOCALIZED_TEXT.claimFailureToast),
    ).toBeOnTheScreen();
    expect(
      callsFor(engine, 'RewardsMoneyController:initiateClaim'),
    ).toHaveLength(0);
    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    ).toBeOnTheScreen();
  });

  const WAIT_MINUTES_TOAST = 'Claim again in {minutes} minutes';

  it.each([
    {
      caseId: 'G1',
      label: 'payout address is not a Money account',
      status: 422,
      reason: 'PAYOUT_ADDRESS_NOT_MONEY_ACCOUNT',
      message: () => REFERRAL_LOCALIZED_TEXT.claimFailureUnavailableToast,
    },
    {
      caseId: 'G4',
      label: 'address is blocked',
      status: 422,
      reason: 'ADDRESS_BLOCKED',
      message: () => REFERRAL_LOCALIZED_TEXT.claimFailureAddressBlockedToast,
    },
    {
      caseId: 'G5',
      label: 'Money account check is unavailable',
      status: 503,
      reason: 'MONEY_ACCOUNT_CHECK_UNAVAILABLE',
      message: () => REFERRAL_LOCALIZED_TEXT.claimFailureRetryToast,
    },
    {
      caseId: 'G6',
      label: 'release is still waiting',
      status: 409,
      reason: 'AWAITING_RELEASE',
      retryAfterSeconds: 120,
      message: () => 'Claim again in 2 minutes',
    },
    {
      caseId: 'G6',
      label: 'claim is rate limited',
      status: 429,
      reason: 'RATE_LIMITED',
      retryAfterSeconds: 90,
      message: () => 'Claim again in 2 minutes',
    },
  ])(
    'shows the $label toast and stays on earnings when a claim is refused ($caseId)',
    async ({ status, reason, retryAfterSeconds, message }) => {
      const view = renderEarningsTab({
        persona: 'referee',
        summary: EXACT_DOLLAR_EARNINGS_SUMMARY,
        claimReady: true,
        referralMe: {
          ...referralMeFixture('referee'),
          localized_text: {
            ...REFERRAL_LOCALIZED_TEXT,
            claimFailureWaitMinutesToast: WAIT_MINUTES_TOAST,
          },
        },
        handlers: {
          'RewardsMoneyController:initiateClaim': () =>
            Promise.reject(
              new RewardsMoneyClaimRefusalError(
                status,
                reason,
                retryAfterSeconds,
              ),
            ),
        },
      });

      fireEvent.press(
        await view.findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
      );

      expect(await view.findByText(message())).toBeOnTheScreen();
      expect(
        view.getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
      ).toBeOnTheScreen();
      expect(
        view.queryByTestId(
          getRouteParamsProbeTestId(
            Routes.MODAL.REWARDS_MONEY_CLAIMS_PAUSED_MODAL,
          ),
        ),
      ).not.toBeOnTheScreen();
    },
  );

  it('opens the claims paused sheet with the summary a refusal refresh returns', async () => {
    const { findByTestId, queryByTestId, engine } = renderEarningsTab({
      persona: 'referee',
      summary: EXACT_DOLLAR_EARNINGS_SUMMARY,
      summaryAfterRefusal: REFUSAL_REFRESH_SUMMARY,
      claimReady: true,
      initiateClaim: 'under_review',
    });

    fireEvent.press(
      await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    );

    const paramsProbe = await findByTestId(
      getRouteParamsProbeTestId(Routes.MODAL.REWARDS_MONEY_CLAIMS_PAUSED_MODAL),
    );

    expect(JSON.parse(String(paramsProbe.props.children))).toEqual({
      title: REFERRAL_LOCALIZED_TEXT.claimsPausedTitle,
      description: REFERRAL_LOCALIZED_TEXT.claimsPausedDescription,
      totals: {
        lifetime_total: REFUSAL_REFRESH_SUMMARY.lifetime_total,
        claimable: REFUSAL_REFRESH_SUMMARY.claimable,
        held: REFUSAL_REFRESH_SUMMARY.held,
        blocked: REFUSAL_REFRESH_SUMMARY.blocked,
        voided: REFUSAL_REFRESH_SUMMARY.voided,
        pending: REFUSAL_REFRESH_SUMMARY.pending,
        claimed: REFUSAL_REFRESH_SUMMARY.claimed,
      },
      labels: {
        breakdown: REFERRAL_LOCALIZED_TEXT.breakdown,
        recordedEarningsLabel: REFERRAL_LOCALIZED_TEXT.totalEarningsLabel,
        availableToClaim: REFERRAL_LOCALIZED_TEXT.availableToClaim,
        held: REFERRAL_LOCALIZED_TEXT.held,
        blocked: REFERRAL_LOCALIZED_TEXT.blocked,
        voided: REFERRAL_LOCALIZED_TEXT.voided,
        pending: REFERRAL_LOCALIZED_TEXT.pending,
        claimed: REFERRAL_LOCALIZED_TEXT.claimed,
      },
    });
    expect(
      callsFor(engine, 'RewardsMoneyController:initiateClaim'),
    ).toHaveLength(1);
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('opens the paused sheet for held cashback under the $1 minimum', async () => {
    const { findByTestId, findByText, queryByTestId } = renderEarningsTab({
      persona: 'referee',
      summary: PAUSED_EARNINGS_SUMMARY,
    });

    expect(
      await findByText(
        `${REFERRAL_LOCALIZED_TEXT.balance} \u2022 ${REFERRAL_LOCALIZED_TEXT.mUSD}`,
      ),
    ).toBeOnTheScreen();
    expect(
      await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.AMOUNT),
    ).toHaveTextContent('$112.50');
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    ).not.toBeOnTheScreen();

    fireEvent.press(
      await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.PAUSED_BUTTON),
    );

    const paramsProbe = await findByTestId(
      getRouteParamsProbeTestId(Routes.MODAL.REWARDS_MONEY_CLAIMS_PAUSED_MODAL),
    );

    expect(JSON.parse(String(paramsProbe.props.children))).toEqual(
      expect.objectContaining({
        title: REFERRAL_LOCALIZED_TEXT.claimsPausedTitle,
        description: REFERRAL_LOCALIZED_TEXT.claimsPausedDescription,
        totals: expect.objectContaining({
          lifetime_total: PAUSED_EARNINGS_SUMMARY.lifetime_total,
          claimable: '500000',
          held: '100000000',
          blocked: '12000000',
        }),
      }),
    );
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIMED_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('keeps Claimed disabled when the referee has only claimed cashback', async () => {
    const { findByTestId, getByTestId, queryByTestId, engine } =
      renderEarningsTab({
        persona: 'referee',
        summary: CLAIMED_EARNINGS_SUMMARY,
        claimReady: true,
        initiateClaim: 'hang',
      });

    expect(
      await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIMED_BUTTON),
    ).toBeDisabled();
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.PAUSED_BUTTON),
    ).not.toBeOnTheScreen();

    fireEvent.press(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIMED_BUTTON),
    );

    expect(
      queryByTestId(
        getRouteParamsProbeTestId(
          Routes.MODAL.REWARDS_MONEY_CLAIMS_PAUSED_MODAL,
        ),
      ),
    ).not.toBeOnTheScreen();
    expect(
      callsFor(engine, 'RewardsMoneyController:initiateClaim'),
    ).toHaveLength(0);
  });
});
