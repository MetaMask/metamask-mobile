import type {
  EarningsSummaryDto,
  ReferralLocalizedTextKey,
  TaxFormSubmittedSnapshot,
  TaxFormTokenDto,
  TaxMeDto,
} from '../../../../core/Engine/controllers/rewards-money-controller/types';
import { isPositiveBaseUnits } from './formatUtils';

const PENDING_TITLE: ReferralLocalizedTextKey = 'taxFormPendingTitle';
const PENDING_DESCRIPTION: ReferralLocalizedTextKey =
  'taxFormPendingDescription';
const DETERMINATION_TITLE: ReferralLocalizedTextKey = 'taxDeterminationTitle';
const DETERMINATION_DESCRIPTION: ReferralLocalizedTextKey =
  'taxDeterminationDescription';

export type TaxQuestion = 'attestation' | 'us_activity';

export type TaxDocumentationSheet =
  | { kind: 'none' }
  | {
      kind: 'question';
      question: TaxQuestion;
      titleKey: ReferralLocalizedTextKey;
      descriptionKey: ReferralLocalizedTextKey;
    }
  | {
      kind: 'open_form';
      titleKey: ReferralLocalizedTextKey;
      descriptionKey: ReferralLocalizedTextKey;
      reason: string | null;
      /**
       * True only for `NO_FORM` while the payee can still change the
       * attestation. Continue is the mint. Every later open-form reason
       * leaves this false.
       */
      canChangeAnswer: boolean;
    }
  | {
      kind: 'contact';
      titleKey: ReferralLocalizedTextKey;
      descriptionKey: ReferralLocalizedTextKey;
    }
  | {
      kind: 'info';
      titleKey: ReferralLocalizedTextKey;
      descriptionKey: ReferralLocalizedTextKey;
    };

export type TaxRefusalCall = 'answer' | 'mint';

/**
 * What the client does with a tax refusal. "Re-route" reads `GET /tax/me`
 * again. `fallback` is the sheet when that read fails.
 */
export type TaxRefusalAction =
  | {
      kind: 'reroute';
      fallback: 'info' | 'open_form' | 'attestation' | 'pending' | 'close';
    }
  | { kind: 'pending_info' }
  | { kind: 'not_needed_toast' }
  | { kind: 'wait_toast' }
  | { kind: 'error_toast' }
  | { kind: 'log_and_error_toast' }
  | { kind: 'provider_dead_end' }
  | { kind: 'rate_limited' };

const OPEN_FORM_DESCRIPTIONS: Record<string, ReferralLocalizedTextKey> = {
  NO_FORM: 'taxFormRequiredDescription',
  FORM_INVALID: 'taxFormFixDescription',
  NEEDS_RESUBMISSION: 'taxFormFixDescription',
  OPEN_ISSUE: 'taxFormFixDescription',
  UNSUPPORTED_FORM: 'taxFormUnsupportedDescription',
  TIN_NOT_MATCHED: 'taxTinMismatchDescription',
  FORM_EXPIRED: 'taxFormExpiredDescription',
};

function question(
  which: TaxQuestion,
  titleKey: ReferralLocalizedTextKey,
  descriptionKey: ReferralLocalizedTextKey,
): TaxDocumentationSheet {
  return { kind: 'question', question: which, titleKey, descriptionKey };
}

function openForm(
  descriptionKey: ReferralLocalizedTextKey,
  reason: string | null,
  canChangeAnswer: boolean,
): TaxDocumentationSheet {
  return {
    kind: 'open_form',
    titleKey: 'taxOpenFormTitle',
    descriptionKey,
    reason,
    canChangeAnswer,
  };
}

const pendingInfo = (): TaxDocumentationSheet => ({
  kind: 'info',
  titleKey: PENDING_TITLE,
  descriptionKey: PENDING_DESCRIPTION,
});

const determinationInfo = (): TaxDocumentationSheet => ({
  kind: 'info',
  titleKey: DETERMINATION_TITLE,
  descriptionKey: DETERMINATION_DESCRIPTION,
});

/**
 * The one map from `GET /tax/me` to a sheet. An unknown state, action, or
 * reason uses the determination info sheet.
 */
export function taxSheetFor(taxMe: TaxMeDto): TaxDocumentationSheet {
  const { state, next_action: nextAction, reason, cleared } = taxMe;
  const canChangeAnswer = taxMe.can_change_answer === true;

  if (
    state === 'COMPLETE_OR_VERIFIED' &&
    nextAction === 'NONE' &&
    reason == null
  ) {
    return { kind: 'none' };
  }

  if (state === 'RENEWAL_REQUIRED' && cleared) {
    if (nextAction === 'ANSWER_ATTESTATION' && reason == null) {
      return question(
        'attestation',
        'taxAttestationTitle',
        'taxRenewalAttestationDescription',
      );
    }
    if (nextAction === 'OPEN_FORM' && reason == null) {
      return openForm('taxRenewalFormDescription', null, false);
    }
    return determinationInfo();
  }

  if (state === 'RENEWAL_REQUIRED' && !cleared) {
    if (
      nextAction === 'ANSWER_ATTESTATION' &&
      reason === 'ATTESTATION_EXPIRED'
    ) {
      return question(
        'attestation',
        'taxAttestationTitle',
        'taxAttestationExpiredDescription',
      );
    }
    if (nextAction === 'OPEN_FORM' && reason === 'FORM_EXPIRED') {
      return openForm('taxFormExpiredDescription', reason, false);
    }
    return determinationInfo();
  }

  if (state === 'ACTION_REQUIRED') {
    if (nextAction === 'ANSWER_ATTESTATION' && reason === 'NO_ATTESTATION') {
      return question(
        'attestation',
        'taxAttestationTitle',
        'taxAttestationDescription',
      );
    }
    if (
      nextAction === 'ANSWER_US_ACTIVITY' &&
      reason === 'US_ACTIVITY_ANSWER_REQUIRED'
    ) {
      return question(
        'us_activity',
        'taxUsActivityTitle',
        'taxUsActivityDescription',
      );
    }
    if (nextAction === 'OPEN_FORM') {
      const descriptionKey = reason
        ? OPEN_FORM_DESCRIPTIONS[reason]
        : undefined;
      if (!descriptionKey) {
        return determinationInfo();
      }
      return openForm(
        descriptionKey,
        reason,
        reason === 'NO_FORM' && canChangeAnswer,
      );
    }
    return determinationInfo();
  }

  if (state === 'UNDER_REVIEW' && nextAction === 'NONE') {
    if (
      reason === 'FORM_PENDING' ||
      reason === 'TIN_NOT_MATCHED' ||
      reason === 'REVIEW_PENDING' ||
      reason === 'EXPIRY_UNKNOWN'
    ) {
      return pendingInfo();
    }
    if (reason === 'FORM_NOT_AVAILABLE') {
      return determinationInfo();
    }
    if (reason === 'US_ACTIVITY_BLOCKED') {
      return {
        kind: 'contact',
        titleKey: 'taxContactUsTitle',
        descriptionKey: 'taxUsActivityBlockedDescription',
      };
    }
    if (reason === 'GATE_OFF') {
      return { kind: 'none' };
    }
    return determinationInfo();
  }

  return determinationInfo();
}

/** The snapshot Claim remembers when the form page reports success before a webhook. */
export const PRE_WEBHOOK_TAX_FORM_SNAPSHOT: TaxFormSubmittedSnapshot = {
  state: 'ACTION_REQUIRED',
  next_action: 'OPEN_FORM',
  reason: 'NO_FORM',
};

/** True only for the open-form read that exists before Taxbit's status webhook. */
export function isPreWebhookTaxForm(taxMe: TaxMeDto): boolean {
  return (
    taxMe.state === PRE_WEBHOOK_TAX_FORM_SNAPSHOT.state &&
    taxMe.next_action === PRE_WEBHOOK_TAX_FORM_SNAPSHOT.next_action &&
    taxMe.reason === PRE_WEBHOOK_TAX_FORM_SNAPSHOT.reason
  );
}

export function taxFormSubmittedSnapshot(
  taxMe: TaxMeDto,
): TaxFormSubmittedSnapshot {
  return {
    state: taxMe.state,
    next_action: taxMe.next_action,
    reason: taxMe.reason,
  };
}

/**
 * The form was submitted and `tax/me` has not moved off that snapshot.
 * A null marker, or any changed field, means Claim follows `taxSheetFor`.
 */
export function taxFormSubmissionStillWaiting(
  submitted: TaxFormSubmittedSnapshot | null,
  taxMe: TaxMeDto,
): boolean {
  if (!submitted) {
    return false;
  }
  const current = taxFormSubmittedSnapshot(taxMe);
  return (
    submitted.state === current.state &&
    submitted.next_action === current.next_action &&
    submitted.reason === current.reason
  );
}

/**
 * Claim's sheet. While the remembered snapshot still matches, the payee
 * sees "submitted, checking" instead of the open-form sheet.
 */
export function taxSheetForClaim(
  taxMe: TaxMeDto,
  submitted: TaxFormSubmittedSnapshot | null,
): TaxDocumentationSheet {
  if (taxFormSubmissionStillWaiting(submitted, taxMe)) {
    return pendingInfo();
  }
  return taxSheetFor(taxMe);
}

/**
 * A refusal from an answer or a mint. The data service already retried
 * `SERVER_BUSY` once, so this action is what remains.
 */
export function taxRefusalAction(
  call: TaxRefusalCall,
  status: number,
  code: string,
): TaxRefusalAction {
  if (call === 'answer') {
    if (status === 409 && code === 'ANSWER_ON_FILE') {
      return { kind: 'reroute', fallback: 'info' };
    }
    if (status === 409 && code === 'REVIEW_PENDING') {
      return { kind: 'pending_info' };
    }
    if (status === 409 && code === 'NO_INCOME') {
      return { kind: 'not_needed_toast' };
    }
    if (status === 409 && code === 'NO_VALID_W8') {
      return { kind: 'reroute', fallback: 'open_form' };
    }
    if (status === 503 && code === 'SERVER_BUSY') {
      return { kind: 'wait_toast' };
    }
    if (status === 429) {
      return { kind: 'wait_toast' };
    }
    if (status === 400) {
      return { kind: 'log_and_error_toast' };
    }
    return { kind: 'error_toast' };
  }

  if (status === 409 && code === 'ATTESTATION_REQUIRED') {
    return { kind: 'reroute', fallback: 'attestation' };
  }
  if (status === 409 && code === 'FORM_ON_FILE') {
    return { kind: 'reroute', fallback: 'pending' };
  }
  if (status === 409 && code === 'REVIEW_PENDING') {
    return { kind: 'reroute', fallback: 'pending' };
  }
  if (status === 409 && code === 'FORM_NOT_REQUIRED') {
    return { kind: 'reroute', fallback: 'close' };
  }
  if (status === 409 && code === 'NO_INCOME') {
    return { kind: 'not_needed_toast' };
  }
  if (status === 429) {
    return { kind: 'rate_limited' };
  }
  if (
    status === 503 &&
    (code === 'TAX_PROVIDER_UNCONFIGURED' ||
      code === 'TAX_PROVIDER_UNAVAILABLE')
  ) {
    return { kind: 'provider_dead_end' };
  }
  return { kind: 'error_toast' };
}

/** `ceil(seconds / 60)`, at least 1 when the header is missing. */
export function minutesFromRetryAfter(seconds: number | undefined): number {
  if (seconds === undefined || seconds <= 0) {
    return 1;
  }
  return Math.ceil(seconds / 60);
}

/** Substitutes `{minutes}` the way the claim wait toast does. */
export function withMinutes(
  template: string,
  seconds: number | undefined,
): string {
  if (!template.includes('{minutes}')) {
    return template;
  }
  return template.replaceAll(
    '{minutes}',
    String(minutesFromRetryAfter(seconds)),
  );
}

/**
 * True when every positive held family is held only for tax documentation
 * and nothing is blocked. Claim stays Claim for that balance.
 */
export function incomeHeldOnlyForTax(
  summary: EarningsSummaryDto | null | undefined,
): boolean {
  if (!summary || !isPositiveBaseUnits(summary.held)) {
    return false;
  }
  if (isPositiveBaseUnits(summary.blocked)) {
    return false;
  }
  const families = [
    ...Object.values(summary.self_earned?.by_claim_family ?? {}),
    ...Object.values(summary.earned_by_others?.by_claim_family ?? {}),
  ];
  const heldFamilies = families.filter((family) =>
    isPositiveBaseUnits(family.held),
  );
  if (heldFamilies.length === 0) {
    return false;
  }
  return heldFamilies.every(
    (family) => family.blocking_reason === 'TAX_DETERMINATION_REQUIRED',
  );
}

const LOCAL_TAX_FORM_ENVIRONMENTS = new Set([
  undefined,
  '',
  'local',
  'development',
  'e2e',
  'exp',
]);

/**
 * The page the WebView may open. An https URL from copy wins. A
 * `REWARDS_TAX_FORM_URL` override wins only on a local run, and only for
 * https or `http://localhost` / `http://127.0.0.1`. Anything else is null,
 * and the caller must not mint.
 */
export function resolveTaxFormUrl(
  localizedUrl: string | undefined,
  env: { override?: string; metamaskEnvironment?: string } = {
    override: process.env.REWARDS_TAX_FORM_URL,
    metamaskEnvironment: process.env.METAMASK_ENVIRONMENT,
  },
): string | null {
  const localRun = LOCAL_TAX_FORM_ENVIRONMENTS.has(env.metamaskEnvironment);
  const override = env.override?.trim() ?? '';
  const candidate = (
    localRun && override.length > 0 ? override : (localizedUrl ?? '')
  ).trim();
  if (candidate.length === 0) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  if (url.protocol === 'https:') {
    return url.toString();
  }
  const localHost =
    url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (
    localRun &&
    override.length > 0 &&
    url.protocol === 'http:' &&
    localHost
  ) {
    return url.toString();
  }
  return null;
}

/**
 * Tax documentation runs only when copy names a form page the WebView may
 * open. A hidden or empty `taxFormUrl` leaves the flow off, and follow-trade
 * claiming stays off with it.
 */
export function isTaxFlowEnabled(localizedUrl: string | undefined): boolean {
  return resolveTaxFormUrl(localizedUrl) !== null;
}

/**
 * The form token for the open WebView. It stays in memory for that session
 * and is never written to navigation state, controller state, or a log.
 */
export interface TaxFormSession {
  token: string;
  expiresAt: string;
}

let session: TaxFormSession | null = null;

/**
 * Continue stays disabled until this instant. Memory only: the mint cap is
 * enforced by the server, and this stops another press from reaching it
 * before `Retry-After` elapses, including after the sheet closes.
 */
let mintLimitedUntil: {
  profileId: string;
  untilMs: number;
  retryAfterSeconds: number | undefined;
} | null = null;

/** One minute when the `429` has no `Retry-After`, matching the toast. */
function mintLimitSeconds(retryAfterSeconds: number | undefined): number {
  if (retryAfterSeconds === undefined || retryAfterSeconds <= 0) {
    return 60;
  }
  return retryAfterSeconds;
}

export function holdMintRateLimit(
  profileId: string,
  retryAfterSeconds: number | undefined,
): void {
  mintLimitedUntil = {
    profileId,
    untilMs: Date.now() + mintLimitSeconds(retryAfterSeconds) * 1000,
    retryAfterSeconds,
  };
}

function activeMintRateLimit(profileId: string): {
  untilMs: number;
  retryAfterSeconds: number | undefined;
} | null {
  if (!mintLimitedUntil || mintLimitedUntil.profileId !== profileId) {
    return null;
  }
  if (Date.now() >= mintLimitedUntil.untilMs) {
    mintLimitedUntil = null;
    return null;
  }
  return mintLimitedUntil;
}

/** Milliseconds left for this profile, or 0 once the window has passed. */
export function mintRateLimitRemainingMs(profileId: string): number {
  const limit = activeMintRateLimit(profileId);
  if (!limit) {
    return 0;
  }
  return limit.untilMs - Date.now();
}

/**
 * The `Retry-After` the toast used, while Continue stays disabled. Null once
 * the window has passed.
 */
export function readMintRateLimit(
  profileId: string,
): { retryAfterSeconds: number | undefined } | null {
  const limit = activeMintRateLimit(profileId);
  if (!limit) {
    return null;
  }
  return { retryAfterSeconds: limit.retryAfterSeconds };
}

export function clearMintRateLimit(): void {
  mintLimitedUntil = null;
}

export function holdTaxFormSession(minted: TaxFormTokenDto): void {
  session = { token: minted.token, expiresAt: minted.expires_at };
}

export function readTaxFormSession(): TaxFormSession | null {
  return session;
}

export function clearTaxFormSession(): void {
  session = null;
}
