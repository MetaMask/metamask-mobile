import type { CardSummaryResponse } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import {
  cardCashbackBreakdown,
  cardCashbackClaimFailure,
  cardCashbackCopy,
  musdFromBaseUnits,
} from './cardCashbackCopy';

const summary = (
  overrides: Partial<CardSummaryResponse> = {},
): CardSummaryResponse => ({
  lifetime_total: '380000',
  claimable: '0',
  held: '0',
  blocked: '380000',
  voided: '0',
  pending: '0',
  claimed: '0',
  minimum_musd_base_units: '10000',
  blocking_reason: 'MECHANISM_NOT_CLAIMABLE',
  pairing_pending: false,
  ...overrides,
});

const NO_MPC = { mpcAccount: false };

describe('cardCashbackCopy', () => {
  it('says claiming has not opened when the mechanism is closed', () => {
    const copy = cardCashbackCopy(summary(), NO_MPC);

    expect(copy).toEqual({
      notice: {
        severity: 'info',
        description:
          "Claiming mUSD back isn't available yet. Your balance is safe, and you can claim it once claiming opens.",
      },
      actionUnavailable: 'Claiming not available yet',
      blocksClaim: true,
    });
  });

  it.each([
    [
      'pairing pending',
      { blocking_reason: null, pairing_pending: true },
      'Finish pairing your Money account to claim your mUSD back.',
    ],
    [
      'a suspended account',
      { blocking_reason: 'SUSPENDED' as const },
      'Claiming is paused on your account. Contact support for help.',
    ],
    [
      'an address that cannot be screened',
      { blocking_reason: 'EARNING_ADDRESS_UNSCREENABLE' as const },
      'Claiming is temporarily unavailable. Try again later.',
    ],
    [
      'a missing earning address',
      { blocking_reason: 'EARNING_ADDRESS_MISSING' as const },
      "We can't confirm where this mUSD back was earned. Contact support for help.",
    ],
    [
      'a voided balance',
      { blocking_reason: 'VOIDED' as const },
      'This mUSD back is no longer payable.',
    ],
    [
      'a balance under the minimum',
      { blocking_reason: 'BELOW_MINIMUM' as const, claimable: '5000' },
      "You'll need at least 0.01 mUSD to claim.",
    ],
  ])('blocks the claim for %s', (_name, overrides, description) => {
    const copy = cardCashbackCopy(summary(overrides), NO_MPC);

    expect(copy.blocksClaim).toBe(true);
    expect(copy.notice?.description).toBe(description);
  });

  it('shows a generic sentence for a reason this build does not know', () => {
    const copy = cardCashbackCopy(
      summary({
        blocking_reason:
          'SOMETHING_NEW' as CardSummaryResponse['blocking_reason'],
      }),
      NO_MPC,
    );

    expect(copy.notice?.description).toBe(
      "Claiming isn't available right now.",
    );
  });

  it('blocks an MPC Money account', () => {
    const copy = cardCashbackCopy(
      summary({ blocking_reason: null, claimable: '380000' }),
      { mpcAccount: true },
    );

    expect(copy.notice?.description).toBe(
      "Claims aren't available for this Money account yet.",
    );
  });

  it('lets a claimable balance be claimed with no notice', () => {
    const copy = cardCashbackCopy(
      summary({ blocking_reason: null, claimable: '380000' }),
      NO_MPC,
    );

    expect(copy).toEqual({
      actionUnavailable: 'Claim unavailable',
      blocksClaim: false,
    });
  });

  it('keeps the claim open while part of the balance is under review', () => {
    const copy = cardCashbackCopy(
      summary({ blocking_reason: 'UNDER_REVIEW', claimable: '380000' }),
      NO_MPC,
    );

    expect(copy.blocksClaim).toBe(false);
  });

  it('says there is nothing to claim when the balance is empty', () => {
    const copy = cardCashbackCopy(
      summary({ blocking_reason: 'NO_ELIGIBLE_BALANCE', blocked: '0' }),
      NO_MPC,
    );

    expect(copy.actionUnavailable).toBe('Nothing to claim yet');
  });
});

describe('cardCashbackBreakdown', () => {
  it('lists only the buckets that hold something', () => {
    expect(
      cardCashbackBreakdown(summary({ pending: '90000', blocked: '290000' })),
    ).toEqual([
      { key: 'pending', label: 'Pending', value: '0.09 mUSD' },
      { key: 'blocked', label: 'Blocked', value: '0.29 mUSD' },
    ]);
  });
});

describe('cardCashbackClaimFailure', () => {
  it.each([
    ['not_claimable', "Claiming mUSD back isn't available yet."],
    ['paused', 'Claiming is paused. Contact support for help.'],
    ['below_minimum', 'Your balance is below the minimum to claim.'],
    ['nothing_to_claim', "There's nothing to claim yet."],
    ['wait', 'Claiming is busy right now. Try again in a few minutes.'],
    ['retry', 'Claim failed. Try again.'],
    [
      'address_blocked',
      "We couldn't complete this claim. Contact support for help.",
    ],
  ])('explains a %s refusal', (category, message) => {
    expect(cardCashbackClaimFailure(category)).toBe(message);
  });
});

describe('musdFromBaseUnits', () => {
  it('reads six-decimal base units', () => {
    expect(musdFromBaseUnits('380000')).toBe('0.38');
  });

  it('reads an unreadable amount as zero', () => {
    expect(musdFromBaseUnits('abc')).toBe('0');
  });
});
