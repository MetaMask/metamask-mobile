/**
 * Claim card states on the Ways to earn tab through the real summary, history, and claim hooks.
 *
 * yarn jest -c jest.config.view.js app/components/UI/Rewards/components/Money/Tabs/WaysToEarnTab.view.test.tsx --runInBand --coverage=false
 */
import '../../../../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';
import Routes from '../../../../../../constants/navigation/Routes';
import Engine from '../../../../../../core/Engine';
import { RewardsMoneyClaimRefusalError } from '../../../../../../core/Engine/controllers/rewards-money-controller/services/rewards-money-data-service';
import { CLAIMABLE_REWARDS_CARD_TEST_IDS } from '../ClaimableRewardsCard.testIds';
import { TAX_FORM_QUESTION_SHEET_TEST_IDS } from '../TaxFormQuestionSheet.testIds';
import { WAYS_TO_EARN_TAB_TEST_IDS } from './WaysToEarnTab.testIds';
import { getRouteParamsProbeTestId } from '../../../../../../../tests/component-view/render';
import { renderWaysToEarnTab } from '../../../../../../../tests/component-view/renderers/rewardsMoney';
import {
  byAddressRowFixture,
  CLAIMED_EARNINGS_SUMMARY,
  earningsSummaryFixture,
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

/** $1 of follow-trade, the claim minimum. Cashback stays at zero. */
const FOLLOW_TRADE_SUMMARY = earningsSummaryFixture({
  lifetimeTotal: '1000000',
  claimable: '1000000',
  cashbackClaimable: '0',
  followTradeClaimable: '1000000',
});

/** $1 of cashback and $1 of follow-trade, each at the claim minimum. */
const CASHBACK_AND_FOLLOW_TRADE_SUMMARY = earningsSummaryFixture({
  lifetimeTotal: '2000000',
  claimable: '2000000',
  cashbackClaimable: '1000000',
  followTradeClaimable: '1000000',
});

function commissionsPage(followTradeClaimOpen: boolean) {
  return async () => ({
    results: [],
    mechanisms: {
      REFERRAL_REV_SHARE: { claim_open: false, reason: null },
      SOCIAL_FOLLOW_TRADE: {
        claim_open: followTradeClaimOpen,
        reason: followTradeClaimOpen ? null : 'MECHANISM_NOT_CLAIMABLE',
      },
    },
    has_more: false,
    cursor: null,
  });
}

function incomeCommissions({
  followTrade = false,
  revShare = false,
}: {
  followTrade?: boolean;
  revShare?: boolean;
}) {
  return async () => ({
    results: [],
    mechanisms: {
      REFERRAL_REV_SHARE: {
        claim_open: revShare,
        reason: revShare ? null : 'MECHANISM_NOT_CLAIMABLE',
      },
      SOCIAL_FOLLOW_TRADE: {
        claim_open: followTrade,
        reason: followTrade ? null : 'MECHANISM_NOT_CLAIMABLE',
      },
    },
    has_more: false,
    cursor: null,
  });
}

const ON_DEVICE = '0x1111111111111111111111111111111111111111';
const ELSEWHERE = '0x3333333333333333333333333333333333333333';
const ONE_DOLLAR = '1000000';
const EARNED_ELSEWHERE_COPY =
  'Some earnings belong to accounts not on this device. Import the wallet to claim.';

function installDeviceKeyring(address: string) {
  const keyrings = Engine.context.KeyringController.state.keyrings as {
    type: string;
    accounts: string[];
  }[];
  keyrings.push({ type: 'HD Key Tree', accounts: [address] });
  return () => {
    keyrings.length = 0;
  };
}
/** Proof asks for both addresses. The narrowed retry is accepted without signing. */
async function mixedAddressClaim(route: unknown, body: unknown) {
  const request = (body ?? {}) as Record<string, unknown>;
  if (
    route === 'referral-rev-share' ||
    request.earning_addresses ||
    request.proofs
  ) {
    return openedClaim();
  }
  return {
    kind: 'proof_required',
    body: {
      reason: 'PROOF_REQUIRED',
      claim_intent_id: 'intent-1',
      expires_at: '2026-09-29T00:00:00.000Z',
      challenges: [
        {
          earning_address: `eip155:${ON_DEVICE}`,
          amount_musd_base_units: ONE_DOLLAR,
          message: 'sign here',
        },
        {
          earning_address: `eip155:${ELSEWHERE}`,
          amount_musd_base_units: ONE_DOLLAR,
          message: 'sign elsewhere',
        },
      ],
    },
  };
}

function mixedSignSummary() {
  const summary = earningsSummaryFixture({
    lifetimeTotal: '3000000',
    claimable: '3000000',
    cashbackClaimable: ONE_DOLLAR,
    revShareLifetime: ONE_DOLLAR,
    followTradeClaimable: ONE_DOLLAR,
  });
  summary.self_earned.by_claim_family.REFERRAL_TRADE_FEE_CASHBACK.by_address = [
    byAddressRowFixture(`eip155:${ELSEWHERE}`),
    byAddressRowFixture(`eip155:${ON_DEVICE}`),
  ];
  summary.earned_by_others.by_claim_family.REFERRAL_REV_SHARE.claimable =
    ONE_DOLLAR;
  const followTrade =
    summary.earned_by_others.by_claim_family.SOCIAL_FOLLOW_TRADE;
  if (!followTrade) {
    throw new Error('follow-trade family missing from the fixture');
  }
  followTrade.by_address = [
    byAddressRowFixture(`eip155:${ELSEWHERE}`),
    byAddressRowFixture(`eip155:${ON_DEVICE}`),
  ];
  return summary;
}

async function openedClaim() {
  return {
    kind: 'authorized',
    body: {
      claim: { id: 'claim-1' },
      voucher: null,
      excluded: [],
      status: 'OPENED',
    },
  };
}

describe('WaysToEarnTab', () => {
  it('claims exactly $1 of referee cashback into the Money account', async () => {
    const { findByTestId, getByTestId, queryByTestId, engine } =
      renderWaysToEarnTab({
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
    const { findByTestId, getByTestId, engine } = renderWaysToEarnTab({
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
    // Social V1 off: a referrer's claimable amount row stays hidden, and the
    // card has nothing else left to show.
    const { findByTestId, queryByTestId, engine } = renderWaysToEarnTab({
      persona: 'referrer',
      summary: EXACT_DOLLAR_EARNINGS_SUMMARY,
      claimReady: true,
      initiateClaim: 'hang',
      socialV1: false,
    });

    expect(
      await findByTestId(WAYS_TO_EARN_TAB_TEST_IDS.HISTORY),
    ).toBeOnTheScreen();
    await waitFor(() => {
      expect(
        callsFor(engine, 'RewardsMoneyController:getEarningsSummary').length,
      ).toBeGreaterThan(0);
    });
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CONTAINER),
    ).not.toBeOnTheScreen();
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

  it('does not offer Claim when the only balance is closed revenue share', async () => {
    const summary = earningsSummaryFixture({
      claimable: '1000000',
      cashbackClaimable: '0',
      revShareLifetime: '1000000',
    });
    summary.earned_by_others.by_claim_family.REFERRAL_REV_SHARE = {
      ...summary.earned_by_others.by_claim_family.REFERRAL_REV_SHARE,
      claimable: '1000000',
    };
    const { findByTestId, findByText, queryByTestId } = renderWaysToEarnTab({
      persona: 'referrer',
      summary,
      claimReady: true,
      initiateClaim: 'hang',
    });

    expect(await findByText(REFERRAL_LOCALIZED_TEXT.balance)).toBeOnTheScreen();
    expect(
      await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.AMOUNT),
    ).toHaveTextContent('$58.50');
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.PAUSED_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('claims follow-trade for a referrer when the claim route is open', async () => {
    const { findByTestId, engine } = renderWaysToEarnTab({
      persona: 'referrer',
      summary: FOLLOW_TRADE_SUMMARY,
      claimReady: true,
      initiateClaim: 'hang',
      handlers: {
        'RewardsMoneyController:getCommissions': commissionsPage(true),
      },
    });

    fireEvent.press(
      await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    );

    await waitFor(() => {
      expect(callsFor(engine, 'RewardsMoneyController:initiateClaim')).toEqual([
        [
          'RewardsMoneyController:initiateClaim',
          'social-follow-trade',
          { money_account_address: REWARDS_MONEY_ACCOUNT_ADDRESS },
        ],
      ]);
    });
  });

  it('does not offer Claim when follow-trade is closed', async () => {
    const { findByTestId, queryByTestId, engine } = renderWaysToEarnTab({
      persona: 'referrer',
      summary: FOLLOW_TRADE_SUMMARY,
      claimReady: true,
      initiateClaim: 'hang',
    });

    // Follow-trade is not claimable, so the balance heading shows the lifetime total.
    expect(
      await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.AMOUNT),
    ).toHaveTextContent('$1.00');
    await waitFor(() => {
      expect(
        callsFor(engine, 'RewardsMoneyController:getCommissions').length,
      ).toBeGreaterThan(0);
    });
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    ).not.toBeOnTheScreen();
    expect(
      callsFor(engine, 'RewardsMoneyController:initiateClaim'),
    ).toHaveLength(0);
  });

  it('claims cashback and follow-trade together for a referee', async () => {
    const { findByTestId, engine } = renderWaysToEarnTab({
      persona: 'referee',
      summary: CASHBACK_AND_FOLLOW_TRADE_SUMMARY,
      claimReady: true,
      handlers: {
        'RewardsMoneyController:getCommissions': commissionsPage(true),
        'RewardsMoneyController:initiateClaim': openedClaim,
      },
    });

    fireEvent.press(
      await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    );

    await waitFor(() => {
      expect(
        callsFor(engine, 'RewardsMoneyController:initiateClaim').map(
          (call) => call[1],
        ),
      ).toEqual(['referral-trade-fee-cashback', 'social-follow-trade']);
    });
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
    const { findByTestId, findByText, getByTestId, engine } =
      renderWaysToEarnTab({
        persona: 'referee',
        summary: EXACT_DOLLAR_EARNINGS_SUMMARY,
        claimReady: true,
        claimGates,
        initiateClaim: 'hang',
      });

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
    'shows the $label toast when a claim is refused ($caseId)',
    async ({ status, reason, retryAfterSeconds, message }) => {
      const view = renderWaysToEarnTab({
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
          'RewardsMoneyController:initiateClaim': async () => {
            throw new RewardsMoneyClaimRefusalError(
              status,
              reason,
              retryAfterSeconds,
            );
          },
        },
      });

      fireEvent.press(
        await view.findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
      );

      const shown = await view.findAllByText(message());
      if (retryAfterSeconds) {
        expect(shown).toHaveLength(2);
        expect(
          view.getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_WAIT),
        ).toHaveTextContent(message());
        expect(
          view.getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
        ).toBeDisabled();
      } else {
        expect(shown).toHaveLength(1);
        expect(
          view.getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
        ).toBeOnTheScreen();
      }
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
    const { findByTestId, queryByTestId, engine } = renderWaysToEarnTab({
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

  it('shows Pending for cashback under the claim minimum', async () => {
    const { findByTestId, findByText, queryByTestId } = renderWaysToEarnTab({
      persona: 'referee',
      summary: earningsSummaryFixture({
        claimable: '400000',
        cashbackClaimable: '400000',
        pending: '100000',
      }),
    });

    expect(await findByText(REFERRAL_LOCALIZED_TEXT.pending)).toBeOnTheScreen();
    expect(
      await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.AMOUNT),
    ).toHaveTextContent('$0.50');
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.PAUSED_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('lists below-minimum cashback under Pending in the balance breakdown', async () => {
    const { findByTestId } = renderWaysToEarnTab({
      persona: 'referee',
      summary: earningsSummaryFixture({
        claimable: '400000',
        cashbackClaimable: '400000',
        pending: '100000',
      }),
    });

    fireEvent.press(
      await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.BALANCE_BREAKDOWN),
    );

    const paramsProbe = await findByTestId(
      getRouteParamsProbeTestId(Routes.MODAL.REWARDS_MONEY_CLAIMS_PAUSED_MODAL),
    );

    expect(JSON.parse(String(paramsProbe.props.children))).toEqual(
      expect.objectContaining({
        variant: 'breakdown',
        totals: expect.objectContaining({
          claimable: '0',
          pending: '500000',
          held: '0',
          blocked: '0',
        }),
      }),
    );
  });

  it('opens the paused sheet for held cashback under the $1 minimum', async () => {
    const { findByTestId, findByText, queryByTestId } = renderWaysToEarnTab({
      persona: 'referee',
      summary: PAUSED_EARNINGS_SUMMARY,
    });

    expect(await findByText(REFERRAL_LOCALIZED_TEXT.balance)).toBeOnTheScreen();
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
      renderWaysToEarnTab({
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

  it('shows the minutes still left under a disabled Claim button', async () => {
    const referralMe = referralMeFixture('referee');
    const { findByText, getByTestId, engine } = renderWaysToEarnTab({
      persona: 'referee',
      summary: EXACT_DOLLAR_EARNINGS_SUMMARY,
      claimReady: true,
      claimWaitUntil: Date.now() + 10 * 60 * 1000,
      referralMe: {
        ...referralMe,
        localized_text: {
          ...referralMe.localized_text,
          claimFailureWaitMinutesToast: 'Claim again in {minutes} minutes',
        },
      },
    });

    expect(await findByText('Claim again in 10 minutes')).toBeOnTheScreen();
    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    ).toBeDisabled();

    fireEvent.press(getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON));

    expect(
      callsFor(engine, 'RewardsMoneyController:initiateClaim'),
    ).toHaveLength(0);
  });

  it('keeps Available to claim with Claim when every cashback address is on another phone', async () => {
    const summary = earningsSummaryFixture({
      lifetimeTotal: ONE_DOLLAR,
      claimable: ONE_DOLLAR,
      cashbackClaimable: ONE_DOLLAR,
    });
    summary.self_earned.by_claim_family.REFERRAL_TRADE_FEE_CASHBACK.by_address =
      [byAddressRowFixture(`eip155:${ELSEWHERE}`)];

    const { findByText, getByTestId, queryByTestId, engine } =
      renderWaysToEarnTab({
        persona: 'referee',
        summary,
        claimReady: true,
      });

    expect(await findByText('Available to claim • mUSD')).toBeOnTheScreen();
    expect(await findByText(EARNED_ELSEWHERE_COPY)).toBeOnTheScreen();
    const claimButton = getByTestId(
      CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON,
    );
    expect(claimButton).toBeDisabled();
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIMED_BUTTON),
    ).not.toBeOnTheScreen();
    fireEvent.press(claimButton);
    expect(
      callsFor(engine, 'RewardsMoneyController:initiateClaim'),
    ).toHaveLength(0);
  });

  it('keeps Claim when one cashback address can be signed on this phone', async () => {
    const restore = installDeviceKeyring(ON_DEVICE);
    try {
      const summary = earningsSummaryFixture({
        lifetimeTotal: ONE_DOLLAR,
        claimable: ONE_DOLLAR,
        cashbackClaimable: ONE_DOLLAR,
      });
      summary.self_earned.by_claim_family.REFERRAL_TRADE_FEE_CASHBACK.by_address =
        [
          byAddressRowFixture(`eip155:${ELSEWHERE}`),
          byAddressRowFixture(`eip155:${ON_DEVICE}`),
        ];

      const { findByTestId, findByText, getByTestId, engine } =
        renderWaysToEarnTab({
          persona: 'referee',
          summary,
          claimReady: true,
          initiateClaim: 'hang',
        });

      expect(await findByText(EARNED_ELSEWHERE_COPY)).toBeOnTheScreen();
      expect(
        getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
      ).not.toBeDisabled();
      fireEvent.press(
        await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
      );

      await waitFor(() => {
        expect(
          callsFor(engine, 'RewardsMoneyController:initiateClaim'),
        ).toEqual([
          [
            'RewardsMoneyController:initiateClaim',
            'referral-trade-fee-cashback',
            { money_account_address: REWARDS_MONEY_ACCOUNT_ADDRESS },
          ],
        ]);
      });
      expect(
        getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
      ).toBeOnTheScreen();
    } finally {
      restore();
    }
  });

  it('submits only the signable cashback when some addresses can be signed and tax is uncleared', async () => {
    const restore = installDeviceKeyring(ON_DEVICE);
    try {
      const { findByTestId, findByText, getByTestId, engine } =
        renderWaysToEarnTab({
          persona: 'referrer',
          summary: mixedSignSummary(),
          claimReady: true,
          handlers: {
            'RewardsMoneyController:getCommissions': incomeCommissions({
              revShare: true,
              followTrade: true,
            }),
            'RewardsMoneyController:getTaxMe': async () => ({
              state: 'ACTION_REQUIRED',
              next_action: 'ANSWER_ATTESTATION',
              reason: 'NO_ATTESTATION',
              clears_until: null,
              cleared: false,
              can_change_answer: false,
            }),
            'RewardsMoneyController:initiateClaim': mixedAddressClaim,
          },
        });

      expect(await findByText(EARNED_ELSEWHERE_COPY)).toBeOnTheScreen();
      await waitFor(() => {
        expect(
          getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
        ).not.toBeDisabled();
      });
      fireEvent.press(
        await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
      );

      await waitFor(() => {
        expect(
          callsFor(engine, 'RewardsMoneyController:initiateClaim'),
        ).toEqual([
          [
            'RewardsMoneyController:initiateClaim',
            'referral-trade-fee-cashback',
            { money_account_address: REWARDS_MONEY_ACCOUNT_ADDRESS },
          ],
          [
            'RewardsMoneyController:initiateClaim',
            'referral-trade-fee-cashback',
            {
              money_account_address: REWARDS_MONEY_ACCOUNT_ADDRESS,
              earning_addresses: [`eip155:${ON_DEVICE}`],
            },
          ],
        ]);
      });
    } finally {
      restore();
    }
  });

  it('submits every signable route when some addresses can be signed and tax is cleared', async () => {
    const restore = installDeviceKeyring(ON_DEVICE);
    try {
      const { findByTestId, findByText, getByTestId, engine } =
        renderWaysToEarnTab({
          persona: 'referrer',
          summary: mixedSignSummary(),
          claimReady: true,
          handlers: {
            'RewardsMoneyController:getCommissions': incomeCommissions({
              revShare: true,
              followTrade: true,
            }),
            'RewardsMoneyController:initiateClaim': mixedAddressClaim,
          },
        });

      expect(await findByText(EARNED_ELSEWHERE_COPY)).toBeOnTheScreen();
      await waitFor(() => {
        expect(
          getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
        ).not.toBeDisabled();
      });
      fireEvent.press(
        await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
      );

      const moneyAccount = {
        money_account_address: REWARDS_MONEY_ACCOUNT_ADDRESS,
      };
      const signableCashback = {
        ...moneyAccount,
        earning_addresses: [`eip155:${ON_DEVICE}`],
      };
      await waitFor(() => {
        expect(
          callsFor(engine, 'RewardsMoneyController:initiateClaim'),
        ).toEqual([
          [
            'RewardsMoneyController:initiateClaim',
            'referral-trade-fee-cashback',
            moneyAccount,
          ],
          [
            'RewardsMoneyController:initiateClaim',
            'referral-trade-fee-cashback',
            signableCashback,
          ],
          [
            'RewardsMoneyController:initiateClaim',
            'referral-rev-share',
            moneyAccount,
          ],
          [
            'RewardsMoneyController:initiateClaim',
            'social-follow-trade',
            moneyAccount,
          ],
          [
            'RewardsMoneyController:initiateClaim',
            'social-follow-trade',
            signableCashback,
          ],
        ]);
      });
    } finally {
      restore();
    }
  });

  it('keeps Available to claim with Claim when follow-trade addresses are not on this phone', async () => {
    const summary = earningsSummaryFixture({
      lifetimeTotal: ONE_DOLLAR,
      claimable: ONE_DOLLAR,
      cashbackClaimable: '0',
      followTradeClaimable: ONE_DOLLAR,
    });
    const followTrade =
      summary.earned_by_others.by_claim_family.SOCIAL_FOLLOW_TRADE;
    if (!followTrade) {
      throw new Error('follow-trade family missing from the fixture');
    }
    followTrade.by_address = [byAddressRowFixture(`eip155:${ELSEWHERE}`)];

    const { findByText, getByTestId, queryByTestId } = renderWaysToEarnTab({
      persona: 'referrer',
      summary,
      claimReady: true,
      handlers: {
        'RewardsMoneyController:getCommissions': incomeCommissions({
          followTrade: true,
        }),
      },
    });

    expect(await findByText('Available to claim • mUSD')).toBeOnTheScreen();
    expect(await findByText(EARNED_ELSEWHERE_COPY)).toBeOnTheScreen();
    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    ).toBeDisabled();
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIMED_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('opens the tax sheet and submits nothing when cashback is unsignable, revenue share is open, and tax is uncleared', async () => {
    const summary = earningsSummaryFixture({
      lifetimeTotal: '2000000',
      claimable: '2000000',
      cashbackClaimable: ONE_DOLLAR,
      revShareLifetime: ONE_DOLLAR,
    });
    summary.self_earned.by_claim_family.REFERRAL_TRADE_FEE_CASHBACK.by_address =
      [byAddressRowFixture(`eip155:${ELSEWHERE}`)];
    summary.earned_by_others.by_claim_family.REFERRAL_REV_SHARE.claimable =
      ONE_DOLLAR;

    const { findByTestId, getByTestId, queryByTestId, engine } =
      renderWaysToEarnTab({
        persona: 'referrer',
        summary,
        claimReady: true,
        initiateClaim: 'hang',
        handlers: {
          'RewardsMoneyController:getCommissions': incomeCommissions({
            revShare: true,
          }),
          'RewardsMoneyController:getTaxMe': async () => ({
            state: 'ACTION_REQUIRED',
            next_action: 'ANSWER_ATTESTATION',
            reason: 'NO_ATTESTATION',
            clears_until: null,
            cleared: false,
            can_change_answer: false,
          }),
        },
      });

    await waitFor(() => {
      expect(
        getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
      ).not.toBeDisabled();
    });
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.EARNED_ELSEWHERE_CAPTION),
    ).toHaveTextContent(EARNED_ELSEWHERE_COPY);

    fireEvent.press(
      await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    );

    expect(
      await findByTestId(TAX_FORM_QUESTION_SHEET_TEST_IDS.TITLE),
    ).toHaveTextContent(REFERRAL_LOCALIZED_TEXT.taxAttestationTitle);
    expect(
      callsFor(engine, 'RewardsMoneyController:initiateClaim'),
    ).toHaveLength(0);
  });

  it('opens the tax sheet when cashback is unsignable and revenue share is held for tax', async () => {
    const summary = earningsSummaryFixture({
      lifetimeTotal: '2000000',
      claimable: ONE_DOLLAR,
      held: ONE_DOLLAR,
      cashbackClaimable: ONE_DOLLAR,
      revShareLifetime: ONE_DOLLAR,
    });
    summary.self_earned.by_claim_family.REFERRAL_TRADE_FEE_CASHBACK.by_address =
      [byAddressRowFixture(`eip155:${ELSEWHERE}`)];
    summary.earned_by_others.by_claim_family.REFERRAL_REV_SHARE = {
      ...summary.earned_by_others.by_claim_family.REFERRAL_REV_SHARE,
      claimable: '0',
      held: ONE_DOLLAR,
      blocking_reason: 'TAX_DETERMINATION_REQUIRED',
    };

    const { findByTestId, getByTestId, engine } = renderWaysToEarnTab({
      persona: 'referrer',
      summary,
      claimReady: true,
      initiateClaim: 'hang',
      handlers: {
        'RewardsMoneyController:getCommissions': incomeCommissions({
          revShare: true,
        }),
        'RewardsMoneyController:getTaxMe': async () => ({
          state: 'ACTION_REQUIRED',
          next_action: 'ANSWER_ATTESTATION',
          reason: 'NO_ATTESTATION',
          clears_until: null,
          cleared: false,
          can_change_answer: false,
        }),
      },
    });

    await waitFor(() => {
      expect(
        getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
      ).not.toBeDisabled();
    });
    fireEvent.press(
      await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    );

    expect(
      await findByTestId(TAX_FORM_QUESTION_SHEET_TEST_IDS.TITLE),
    ).toHaveTextContent(REFERRAL_LOCALIZED_TEXT.taxAttestationTitle);
    expect(
      callsFor(engine, 'RewardsMoneyController:initiateClaim'),
    ).toHaveLength(0);
  });

  it('still claims revenue share when cashback addresses are not on this phone', async () => {
    const summary = earningsSummaryFixture({
      lifetimeTotal: '2000000',
      claimable: '2000000',
      cashbackClaimable: ONE_DOLLAR,
      revShareLifetime: ONE_DOLLAR,
    });
    summary.self_earned.by_claim_family.REFERRAL_TRADE_FEE_CASHBACK.by_address =
      [byAddressRowFixture(`eip155:${ELSEWHERE}`)];
    summary.earned_by_others.by_claim_family.REFERRAL_REV_SHARE.claimable =
      ONE_DOLLAR;

    const { findByTestId, findByText, getByTestId, engine } =
      renderWaysToEarnTab({
        persona: 'referrer',
        summary,
        claimReady: true,
        initiateClaim: 'hang',
        handlers: {
          'RewardsMoneyController:getCommissions': incomeCommissions({
            revShare: true,
          }),
        },
      });

    expect(await findByText(EARNED_ELSEWHERE_COPY)).toBeOnTheScreen();
    await waitFor(() => {
      expect(
        getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
      ).not.toBeDisabled();
    });
    fireEvent.press(
      await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    );

    await waitFor(() => {
      expect(callsFor(engine, 'RewardsMoneyController:initiateClaim')).toEqual([
        [
          'RewardsMoneyController:initiateClaim',
          'referral-rev-share',
          { money_account_address: REWARDS_MONEY_ACCOUNT_ADDRESS },
        ],
      ]);
    });
  });
});
