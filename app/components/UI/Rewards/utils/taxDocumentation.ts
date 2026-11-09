import type {
  EarningsSummaryDto,
  ReferralLocalizedTextKey,
  SummaryTotalsDto,
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

const PENDING_REVIEW_REASONS = new Set([
  'FORM_PENDING',
  'TIN_NOT_MATCHED',
  'REVIEW_PENDING',
  'EXPIRY_UNKNOWN',
]);

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

function sheetWhenClear(taxMe: TaxMeDto): TaxDocumentationSheet | null {
  if (
    taxMe.state === 'COMPLETE_OR_VERIFIED' &&
    taxMe.next_action === 'NONE' &&
    taxMe.reason == null
  ) {
    return { kind: 'none' };
  }
  return null;
}

function clearedRenewalSheet(taxMe: TaxMeDto): TaxDocumentationSheet {
  const { next_action: nextAction, reason } = taxMe;
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

function expiredRenewalSheet(taxMe: TaxMeDto): TaxDocumentationSheet {
  const { next_action: nextAction, reason } = taxMe;
  if (nextAction === 'ANSWER_ATTESTATION' && reason === 'ATTESTATION_EXPIRED') {
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

function sheetForRenewal(taxMe: TaxMeDto): TaxDocumentationSheet | null {
  if (taxMe.state !== 'RENEWAL_REQUIRED') {
    return null;
  }
  if (taxMe.cleared) {
    return clearedRenewalSheet(taxMe);
  }
  return expiredRenewalSheet(taxMe);
}

function openFormForReason(taxMe: TaxMeDto): TaxDocumentationSheet {
  const { reason } = taxMe;
  const descriptionKey = reason ? OPEN_FORM_DESCRIPTIONS[reason] : undefined;
  if (!descriptionKey) {
    return determinationInfo();
  }
  return openForm(
    descriptionKey,
    reason,
    reason === 'NO_FORM' && taxMe.can_change_answer === true,
  );
}

function sheetForAction(taxMe: TaxMeDto): TaxDocumentationSheet | null {
  if (taxMe.state !== 'ACTION_REQUIRED') {
    return null;
  }
  const { next_action: nextAction, reason } = taxMe;
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
    return openFormForReason(taxMe);
  }
  return determinationInfo();
}

function sheetForReview(taxMe: TaxMeDto): TaxDocumentationSheet | null {
  if (taxMe.state !== 'UNDER_REVIEW' || taxMe.next_action !== 'NONE') {
    return null;
  }
  const { reason } = taxMe;
  if (reason !== null && PENDING_REVIEW_REASONS.has(reason)) {
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

/**
 * The one map from `GET /tax/me` to a sheet. An unknown state, action, or
 * reason uses the determination info sheet.
 */
export function taxSheetFor(taxMe: TaxMeDto): TaxDocumentationSheet {
  return (
    sheetWhenClear(taxMe) ??
    sheetForRenewal(taxMe) ??
    sheetForAction(taxMe) ??
    sheetForReview(taxMe) ??
    determinationInfo()
  );
}

/**
 * The snapshot used when a submit's status read fails and no open-form
 * read is cached. The first form, before any webhook, is this read.
 */
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

/**
 * True when this read still tells the payee to open the form: the first
 * form, a correction, a TIN mismatch, or an expired or renewal form.
 */
export function isOpenFormTaxMe(taxMe: TaxMeDto): boolean {
  return taxSheetFor(taxMe).kind === 'open_form';
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
 * The snapshot is whatever open-form read was current at submit. A null
 * marker, or any changed field, means Claim follows `taxSheetFor`.
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
 * Claim's sheet. While the remembered open-form snapshot still matches,
 * Claim follows the fresh read once it changes and does not open a sheet
 * of its own. The payee is not sent back to the form, and the claim is
 * not skipped, during the gap before Taxbit's webhook.
 */
export function taxSheetForClaim(
  taxMe: TaxMeDto,
  submitted: TaxFormSubmittedSnapshot | null,
): TaxDocumentationSheet {
  if (taxFormSubmissionStillWaiting(submitted, taxMe)) {
    return { kind: 'none' };
  }
  return taxSheetFor(taxMe);
}

const ANSWER_CONFLICTS: Record<string, TaxRefusalAction> = {
  ANSWER_ON_FILE: { kind: 'reroute', fallback: 'info' },
  REVIEW_PENDING: { kind: 'pending_info' },
  NO_INCOME: { kind: 'not_needed_toast' },
  NO_VALID_W8: { kind: 'reroute', fallback: 'open_form' },
};

const MINT_CONFLICTS: Record<string, TaxRefusalAction> = {
  ATTESTATION_REQUIRED: { kind: 'reroute', fallback: 'attestation' },
  FORM_ON_FILE: { kind: 'reroute', fallback: 'pending' },
  REVIEW_PENDING: { kind: 'reroute', fallback: 'pending' },
  FORM_NOT_REQUIRED: { kind: 'reroute', fallback: 'close' },
  NO_INCOME: { kind: 'not_needed_toast' },
};

const ERROR_TOAST: TaxRefusalAction = { kind: 'error_toast' };

function refusalForConflict(
  conflicts: Record<string, TaxRefusalAction>,
  code: string,
): TaxRefusalAction {
  return conflicts[code] ?? ERROR_TOAST;
}

function answerRefusal(status: number, code: string): TaxRefusalAction {
  if (status === 409) {
    return refusalForConflict(ANSWER_CONFLICTS, code);
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
  return ERROR_TOAST;
}

function providerUnavailable(code: string): boolean {
  return (
    code === 'TAX_PROVIDER_UNCONFIGURED' || code === 'TAX_PROVIDER_UNAVAILABLE'
  );
}

function mintRefusal(status: number, code: string): TaxRefusalAction {
  if (status === 409) {
    return refusalForConflict(MINT_CONFLICTS, code);
  }
  if (status === 429) {
    return { kind: 'rate_limited' };
  }
  if (status === 503 && providerUnavailable(code)) {
    return { kind: 'provider_dead_end' };
  }
  return ERROR_TOAST;
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
    return answerRefusal(status, code);
  }
  return mintRefusal(status, code);
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
 * True when this family's balance is held for tax documentation. Cashback
 * is never held for tax.
 */
function familyHeldForTax(family: SummaryTotalsDto | undefined): boolean {
  return (
    isPositiveBaseUnits(family?.held) &&
    family?.blocking_reason === 'TAX_DETERMINATION_REQUIRED'
  );
}

/** True when follow-trade is held for tax documentation. */
export function followTradeHeldForTax(
  summary: EarningsSummaryDto | null | undefined,
): boolean {
  return familyHeldForTax(
    summary?.earned_by_others?.by_claim_family?.SOCIAL_FOLLOW_TRADE,
  );
}

/** True when revenue share is held for tax documentation. */
export function revShareHeldForTax(
  summary: EarningsSummaryDto | null | undefined,
): boolean {
  return familyHeldForTax(
    summary?.earned_by_others?.by_claim_family?.REFERRAL_REV_SHARE,
  );
}

/**
 * True when follow-trade or revenue share is held for tax documentation.
 * Both claim routes stay off until the tax form is on, so either hold is a
 * reason to read `tax/me` fresh.
 */
export function incomeHeldForTax(
  summary: EarningsSummaryDto | null | undefined,
): boolean {
  return followTradeHeldForTax(summary) || revShareHeldForTax(summary);
}

/** Read at call time so a test can change the process env after import. */
const taxFormEnvFromProcess: {
  override?: string;
  metamaskEnvironment?: string;
} = {
  get override() {
    return process.env.REWARDS_TAX_FORM_URL;
  },
  get metamaskEnvironment() {
    return process.env.METAMASK_ENVIRONMENT;
  },
};

const LOCAL_TAX_FORM_ENVIRONMENTS = new Set([
  undefined,
  '',
  'local',
  'development',
  // `.js.env` sets METAMASK_ENVIRONMENT to `dev` for a local main build.
  'dev',
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
  env: {
    override?: string;
    metamaskEnvironment?: string;
  } = taxFormEnvFromProcess,
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
 * and revenue-share claiming stay off with it.
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
  const limit = mintLimitedUntil;
  if (limit?.profileId !== profileId) {
    return null;
  }
  if (Date.now() >= limit.untilMs) {
    mintLimitedUntil = null;
    return null;
  }
  return limit;
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
