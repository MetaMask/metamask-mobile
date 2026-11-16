import type {
  EarningsSummaryDto,
  TaxMeDto,
} from '../../../../core/Engine/controllers/rewards-money-controller/types';
import {
  clearMintRateLimit,
  holdMintRateLimit,
  followTradeHeldForTax,
  incomeHeldForTax,
  revShareHeldForTax,
  minutesFromRetryAfter,
  mintRateLimitRemainingMs,
  readMintRateLimit,
  isOpenFormTaxMe,
  isPreWebhookTaxForm,
  isTaxFlowEnabled,
  PRE_WEBHOOK_TAX_FORM_SNAPSHOT,
  UNCONFIRMED_TAX_FORM_SUBMISSION,
  resolveTaxFormUrl,
  taxFormSubmissionStillWaiting,
  taxFormSubmittedSnapshot,
  taxRefusalAction,
  taxSheetFor,
  taxSheetForClaim,
  withMinutes,
} from './taxDocumentation';

function taxMe(overrides: Partial<TaxMeDto> = {}): TaxMeDto {
  return {
    state: 'ACTION_REQUIRED',
    next_action: 'NONE',
    reason: null,
    clears_until: null,
    cleared: false,
    can_change_answer: false,
    ...overrides,
  };
}

function heldSummary(options: {
  held?: string;
  blocked?: string;
  familyHeld?: string;
  blockingReason?: string | null;
}): EarningsSummaryDto {
  return {
    held: options.held ?? '0',
    blocked: options.blocked ?? '0',
    self_earned: { by_claim_family: {} },
    earned_by_others: {
      by_claim_family: {
        SOCIAL_FOLLOW_TRADE: {
          held: options.familyHeld ?? '0',
          blocking_reason: options.blockingReason ?? null,
        },
      },
    },
  } as unknown as EarningsSummaryDto;
}

describe('taxSheetFor', () => {
  it('shows nothing when the payee is clear or the gate is off', () => {
    expect(
      taxSheetFor(
        taxMe({
          state: 'COMPLETE_OR_VERIFIED',
          next_action: 'NONE',
          reason: null,
          cleared: true,
        }),
      ),
    ).toEqual({ kind: 'none' });
    expect(
      taxSheetFor(
        taxMe({
          state: 'UNDER_REVIEW',
          next_action: 'NONE',
          reason: 'GATE_OFF',
        }),
      ),
    ).toEqual({ kind: 'none' });
  });

  it('asks the attestation, including renewal and expiry copy', () => {
    expect(
      taxSheetFor(
        taxMe({
          next_action: 'ANSWER_ATTESTATION',
          reason: 'NO_ATTESTATION',
        }),
      ),
    ).toEqual({
      kind: 'question',
      question: 'attestation',
      titleKey: 'taxAttestationTitle',
      descriptionKey: 'taxAttestationDescription',
    });
    expect(
      taxSheetFor(
        taxMe({
          state: 'RENEWAL_REQUIRED',
          next_action: 'ANSWER_ATTESTATION',
          cleared: true,
        }),
      ),
    ).toMatchObject({
      descriptionKey: 'taxRenewalAttestationDescription',
    });
    expect(
      taxSheetFor(
        taxMe({
          state: 'RENEWAL_REQUIRED',
          next_action: 'ANSWER_ATTESTATION',
          reason: 'ATTESTATION_EXPIRED',
          cleared: false,
        }),
      ),
    ).toMatchObject({
      descriptionKey: 'taxAttestationExpiredDescription',
    });
  });

  it('asks the US activity question only for that reason', () => {
    expect(
      taxSheetFor(
        taxMe({
          next_action: 'ANSWER_US_ACTIVITY',
          reason: 'US_ACTIVITY_ANSWER_REQUIRED',
        }),
      ),
    ).toEqual({
      kind: 'question',
      question: 'us_activity',
      titleKey: 'taxUsActivityTitle',
      descriptionKey: 'taxUsActivityDescription',
    });
  });

  it.each([
    ['NO_FORM', 'taxFormRequiredDescription'],
    ['FORM_INVALID', 'taxFormFixDescription'],
    ['NEEDS_RESUBMISSION', 'taxFormFixDescription'],
    ['OPEN_ISSUE', 'taxFormFixDescription'],
    ['UNSUPPORTED_FORM', 'taxFormUnsupportedDescription'],
    ['TIN_NOT_MATCHED', 'taxTinMismatchDescription'],
    ['FORM_EXPIRED', 'taxFormExpiredDescription'],
  ] as const)('opens the form for %s', (reason, descriptionKey) => {
    expect(
      taxSheetFor(
        taxMe({
          next_action: 'OPEN_FORM',
          reason,
          can_change_answer: true,
        }),
      ),
    ).toEqual({
      kind: 'open_form',
      titleKey: 'taxOpenFormTitle',
      descriptionKey,
      reason,
      canChangeAnswer: reason === 'NO_FORM',
    });
  });

  it('offers Change my answer only before the first form token', () => {
    expect(
      taxSheetFor(
        taxMe({
          next_action: 'OPEN_FORM',
          reason: 'NO_FORM',
          can_change_answer: false,
        }),
      ),
    ).toMatchObject({ canChangeAnswer: false });
  });

  it('uses renewal form copy when a cleared form is about to expire', () => {
    expect(
      taxSheetFor(
        taxMe({
          state: 'RENEWAL_REQUIRED',
          next_action: 'OPEN_FORM',
          cleared: true,
          can_change_answer: true,
        }),
      ),
    ).toEqual({
      kind: 'open_form',
      titleKey: 'taxOpenFormTitle',
      descriptionKey: 'taxRenewalFormDescription',
      reason: null,
      canChangeAnswer: false,
    });
  });

  it.each([
    'FORM_PENDING',
    'TIN_NOT_MATCHED',
    'REVIEW_PENDING',
    'EXPIRY_UNKNOWN',
  ] as const)('shows pending review for %s', (reason) => {
    expect(
      taxSheetFor(
        taxMe({ state: 'UNDER_REVIEW', next_action: 'NONE', reason }),
      ),
    ).toEqual({
      kind: 'info',
      titleKey: 'taxFormPendingTitle',
      descriptionKey: 'taxFormPendingDescription',
    });
  });

  it('sends a blocked US-activity payee to contact support', () => {
    expect(
      taxSheetFor(
        taxMe({
          state: 'UNDER_REVIEW',
          next_action: 'NONE',
          reason: 'US_ACTIVITY_BLOCKED',
        }),
      ),
    ).toEqual({
      kind: 'contact',
      titleKey: 'taxContactUsTitle',
      descriptionKey: 'taxUsActivityBlockedDescription',
    });
  });

  it('uses the determination sheet for an unknown or unusable combination', () => {
    expect(taxSheetFor(taxMe({ state: 'SOMETHING_ELSE' }))).toMatchObject({
      titleKey: 'taxDeterminationTitle',
    });
    expect(
      taxSheetFor(taxMe({ next_action: 'OPEN_FORM', reason: 'NOT_A_REASON' })),
    ).toMatchObject({ titleKey: 'taxDeterminationTitle' });
    expect(
      taxSheetFor(
        taxMe({
          state: 'UNDER_REVIEW',
          next_action: 'NONE',
          reason: 'FORM_NOT_AVAILABLE',
        }),
      ),
    ).toMatchObject({ titleKey: 'taxDeterminationTitle' });
  });
});

describe('taxRefusalAction', () => {
  it.each([
    [409, 'ANSWER_ON_FILE', { kind: 'reroute', fallback: 'info' }],
    [409, 'REVIEW_PENDING', { kind: 'pending_info' }],
    [409, 'NO_INCOME', { kind: 'not_needed_toast' }],
    [409, 'NO_VALID_W8', { kind: 'reroute', fallback: 'open_form' }],
    [503, 'SERVER_BUSY', { kind: 'wait_toast' }],
    [429, 'RATE_LIMITED', { kind: 'wait_toast' }],
    [400, 'BAD_REQUEST', { kind: 'log_and_error_toast' }],
    [500, 'UNKNOWN', { kind: 'error_toast' }],
  ] as const)('maps an answer %s %s', (status, code, action) => {
    expect(taxRefusalAction('answer', status, code)).toEqual(action);
  });

  it.each([
    [409, 'ATTESTATION_REQUIRED', { kind: 'reroute', fallback: 'attestation' }],
    [409, 'FORM_ON_FILE', { kind: 'reroute', fallback: 'pending' }],
    [409, 'REVIEW_PENDING', { kind: 'reroute', fallback: 'pending' }],
    [409, 'FORM_NOT_REQUIRED', { kind: 'reroute', fallback: 'close' }],
    [409, 'NO_INCOME', { kind: 'not_needed_toast' }],
    [429, 'RATE_LIMITED', { kind: 'rate_limited' }],
    [503, 'TAX_PROVIDER_UNAVAILABLE', { kind: 'provider_dead_end' }],
    [503, 'TAX_PROVIDER_UNCONFIGURED', { kind: 'provider_dead_end' }],
    [503, 'SERVER_BUSY', { kind: 'error_toast' }],
    [400, 'BAD_REQUEST', { kind: 'error_toast' }],
  ] as const)('maps a mint %s %s', (status, code, action) => {
    expect(taxRefusalAction('mint', status, code)).toEqual(action);
  });
});

describe('minutesFromRetryAfter', () => {
  it('rounds up to a minute and uses 1 when the header is missing', () => {
    expect(minutesFromRetryAfter(undefined)).toBe(1);
    expect(minutesFromRetryAfter(0)).toBe(1);
    expect(minutesFromRetryAfter(60)).toBe(1);
    expect(minutesFromRetryAfter(61)).toBe(2);
    expect(withMinutes('Wait {minutes} minutes.', 120)).toBe('Wait 2 minutes.');
    expect(withMinutes('No placeholder.', 120)).toBe('No placeholder.');
  });
});

describe('isTaxFlowEnabled', () => {
  it('is on only for a form page the WebView may open', () => {
    expect(isTaxFlowEnabled('https://tax.example/form')).toBe(true);
    expect(isTaxFlowEnabled('')).toBe(false);
    expect(isTaxFlowEnabled(undefined)).toBe(false);
    expect(isTaxFlowEnabled('http://tax.example/form')).toBe(false);
  });
});

describe('resolveTaxFormUrl', () => {
  const https = 'https://tax.example/form';

  it('accepts an https copy URL and rejects anything else', () => {
    expect(resolveTaxFormUrl(https, {})).toBe(`${https}`);
    expect(resolveTaxFormUrl('', {})).toBeNull();
    expect(resolveTaxFormUrl('not a url', {})).toBeNull();
    expect(resolveTaxFormUrl('http://tax.example/form', {})).toBeNull();
  });

  it('allows a localhost override only on a local run', () => {
    expect(
      resolveTaxFormUrl(https, {
        override: 'http://127.0.0.1:5173/form',
        metamaskEnvironment: 'local',
      }),
    ).toBe('http://127.0.0.1:5173/form');
    expect(
      resolveTaxFormUrl(https, {
        override: 'http://localhost:5173',
        metamaskEnvironment: 'dev',
      }),
    ).toBe('http://localhost:5173/');
    expect(
      resolveTaxFormUrl(https, {
        override: 'http://127.0.0.1:5173/form',
        metamaskEnvironment: 'production',
      }),
    ).toBe(https);
    expect(
      resolveTaxFormUrl(https, {
        override: 'http://evil.example/form',
        metamaskEnvironment: undefined,
      }),
    ).toBeNull();
  });
});

describe('followTradeHeldForTax', () => {
  it('is true only when follow-trade is held for tax documentation', () => {
    expect(
      followTradeHeldForTax(
        heldSummary({
          held: '100',
          familyHeld: '100',
          blockingReason: 'TAX_DETERMINATION_REQUIRED',
        }),
      ),
    ).toBe(true);
    expect(
      followTradeHeldForTax(
        heldSummary({
          held: '100',
          familyHeld: '100',
          blockingReason: 'UNDER_REVIEW',
        }),
      ),
    ).toBe(false);
    expect(followTradeHeldForTax(heldSummary({ held: '100' }))).toBe(false);
    expect(
      followTradeHeldForTax(
        heldSummary({
          held: '100',
          familyHeld: '0',
          blockingReason: 'TAX_DETERMINATION_REQUIRED',
        }),
      ),
    ).toBe(false);
  });

  it('ignores a revenue-share hold', () => {
    const summary = heldSummary({ held: '100' });
    summary.earned_by_others.by_claim_family = {
      REFERRAL_REV_SHARE: {
        held: '100',
        blocking_reason: 'TAX_DETERMINATION_REQUIRED',
      },
    } as unknown as EarningsSummaryDto['earned_by_others']['by_claim_family'];

    expect(followTradeHeldForTax(summary)).toBe(false);
    expect(revShareHeldForTax(summary)).toBe(true);
    expect(incomeHeldForTax(summary)).toBe(true);
  });
});

describe('revShareHeldForTax', () => {
  it('is true only when revenue share is held for tax documentation', () => {
    const held = heldSummary({ held: '100' });
    held.earned_by_others.by_claim_family = {
      REFERRAL_REV_SHARE: {
        held: '100',
        blocking_reason: 'TAX_DETERMINATION_REQUIRED',
      },
    } as unknown as EarningsSummaryDto['earned_by_others']['by_claim_family'];

    expect(revShareHeldForTax(held)).toBe(true);
    expect(incomeHeldForTax(held)).toBe(true);
    expect(followTradeHeldForTax(held)).toBe(false);

    const underReview = heldSummary({ held: '100' });
    underReview.earned_by_others.by_claim_family = {
      REFERRAL_REV_SHARE: {
        held: '100',
        blocking_reason: 'UNDER_REVIEW',
      },
    } as unknown as EarningsSummaryDto['earned_by_others']['by_claim_family'];
    expect(revShareHeldForTax(underReview)).toBe(false);
    expect(incomeHeldForTax(underReview)).toBe(false);
  });
});

describe('mint rate limit', () => {
  afterEach(() => {
    clearMintRateLimit();
    jest.useRealTimers();
  });

  it('keeps the same profile limited until Retry-After elapses', () => {
    jest.useFakeTimers({ now: new Date('2026-11-02T12:00:00.000Z') });
    holdMintRateLimit('profile-a', 120);

    expect(mintRateLimitRemainingMs('profile-a')).toBe(120_000);
    expect(readMintRateLimit('profile-a')).toEqual({
      retryAfterSeconds: 120,
    });
    expect(mintRateLimitRemainingMs('profile-b')).toBe(0);
    expect(readMintRateLimit('profile-b')).toBeNull();

    jest.advanceTimersByTime(119_000);
    expect(mintRateLimitRemainingMs('profile-a')).toBe(1_000);

    jest.advanceTimersByTime(1_000);
    expect(mintRateLimitRemainingMs('profile-a')).toBe(0);
    expect(readMintRateLimit('profile-a')).toBeNull();
  });

  it('uses one minute when Retry-After is missing', () => {
    jest.useFakeTimers({ now: new Date('2026-11-02T12:00:00.000Z') });
    holdMintRateLimit('profile-a', undefined);

    expect(mintRateLimitRemainingMs('profile-a')).toBe(60_000);
  });
});

describe('tax form submission snapshot', () => {
  const openForm = taxMe({
    next_action: 'OPEN_FORM',
    reason: 'NO_FORM',
    can_change_answer: true,
  });

  it('matches only the pre-webhook open-form read', () => {
    expect(isPreWebhookTaxForm(openForm)).toBe(true);
    expect(
      isPreWebhookTaxForm(
        taxMe({ next_action: 'OPEN_FORM', reason: 'TIN_NOT_MATCHED' }),
      ),
    ).toBe(false);
    expect(isPreWebhookTaxForm(taxMe({ cleared: true }))).toBe(false);
  });

  it('keeps the pending sheet only while the snapshot still matches', () => {
    const submitted = taxFormSubmittedSnapshot(openForm);

    expect(submitted).toEqual(PRE_WEBHOOK_TAX_FORM_SNAPSHOT);
    expect(taxFormSubmissionStillWaiting(submitted, openForm)).toBe(true);
    expect(taxFormSubmissionStillWaiting(null, openForm)).toBe(false);
    expect(
      taxFormSubmissionStillWaiting(
        submitted,
        taxMe({
          state: 'UNDER_REVIEW',
          next_action: 'NONE',
          reason: 'FORM_PENDING',
        }),
      ),
    ).toBe(false);
    expect(taxSheetForClaim(openForm, submitted)).toEqual({
      kind: 'info',
      titleKey: 'taxFormPendingTitle',
      descriptionKey: 'taxFormPendingDescription',
    });
    expect(taxSheetForClaim(openForm, null)).toEqual(taxSheetFor(openForm));
  });

  it('matches a null stored_at snapshot when the read omits stored_at', () => {
    const read = taxMe({
      next_action: 'OPEN_FORM',
      reason: 'NO_FORM',
    });

    expect(read.stored_at).toBeUndefined();
    expect(
      taxFormSubmissionStillWaiting(
        { ...PRE_WEBHOOK_TAX_FORM_SNAPSHOT, stored_at: null },
        read,
      ),
    ).toBe(true);
  });

  it('treats every open-form read as a form the payee can submit', () => {
    expect(isOpenFormTaxMe(openForm)).toBe(true);
    expect(
      isOpenFormTaxMe(
        taxMe({ next_action: 'OPEN_FORM', reason: 'TIN_NOT_MATCHED' }),
      ),
    ).toBe(true);
    expect(
      isOpenFormTaxMe(
        taxMe({ next_action: 'OPEN_FORM', reason: 'FORM_INVALID' }),
      ),
    ).toBe(true);
    expect(
      isOpenFormTaxMe(
        taxMe({
          state: 'RENEWAL_REQUIRED',
          next_action: 'OPEN_FORM',
          reason: 'FORM_EXPIRED',
          cleared: false,
        }),
      ),
    ).toBe(true);
    expect(
      isOpenFormTaxMe(
        taxMe({
          state: 'UNDER_REVIEW',
          next_action: 'NONE',
          reason: 'TIN_NOT_MATCHED',
        }),
      ),
    ).toBe(false);
  });

  it('keeps pending review for a correction until that open-form read changes', () => {
    const mismatch = taxMe({
      next_action: 'OPEN_FORM',
      reason: 'TIN_NOT_MATCHED',
    });
    const submitted = taxFormSubmittedSnapshot(mismatch);

    expect(taxSheetForClaim(mismatch, submitted)).toEqual({
      kind: 'info',
      titleKey: 'taxFormPendingTitle',
      descriptionKey: 'taxFormPendingDescription',
    });
    const storedAgain = taxMe({
      next_action: 'OPEN_FORM',
      reason: 'TIN_NOT_MATCHED',
      stored_at: '2026-11-09T18:00:00.000Z',
    });
    expect(taxFormSubmissionStillWaiting(submitted, storedAgain)).toBe(false);
    expect(
      taxFormSubmissionStillWaiting(UNCONFIRMED_TAX_FORM_SUBMISSION, mismatch),
    ).toBe(true);
    expect(
      taxFormSubmissionStillWaiting(
        UNCONFIRMED_TAX_FORM_SUBMISSION,
        taxMe({
          state: 'COMPLETE_OR_VERIFIED',
          next_action: 'NONE',
          reason: null,
          cleared: true,
        }),
      ),
    ).toBe(false);
    expect(taxSheetForClaim(storedAgain, submitted)).toEqual(
      taxSheetFor(storedAgain),
    );
    expect(
      taxSheetForClaim(
        taxMe({
          state: 'UNDER_REVIEW',
          next_action: 'NONE',
          reason: 'FORM_PENDING',
        }),
        submitted,
      ),
    ).toEqual(
      taxSheetFor(
        taxMe({
          state: 'UNDER_REVIEW',
          next_action: 'NONE',
          reason: 'FORM_PENDING',
        }),
      ),
    );
  });
});
