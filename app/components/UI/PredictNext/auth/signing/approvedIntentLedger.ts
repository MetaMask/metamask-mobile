import SecureKeychain from '../../../../../core/SecureKeychain';
import Logger from '../../../../../util/Logger';
import { ensureError } from '../../../../../util/errorUtils';
import { contentDigest } from './deviceRequestSigner';
import { TemplateError } from './venueTemplates';

/** How long a confirmation stays valid. ADR-0004. */
export const APPROVED_INTENT_TTL_MS = 30 * 60 * 1000;

/** Re-signs of one order body. The first confirmation is sign 1. */
export const APPROVED_INTENT_SIGN_LIMIT = 3;

/** `min_ts` on an order scan must fall in this window before the pin. */
const SCAN_LOOKBACK_SEC = 600;

const LEDGER_VERSION = 1;
const LEDGER_ACCOUNT = 'approved-intents';
const LEDGER_SCOPE = {
  service: 'com.metamask.predict.approved-intents',
  accessible: SecureKeychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

interface PinnedIntent {
  operation: string;
  bodyDigest: string;
  signCount: number;
  pinnedAt: number;
}

interface LedgerFile {
  v: number;
  entries: Record<string, PinnedIntent>;
}

export interface IntentSignatureClaim {
  operation: string;
  idempotencyKey: string;
  /** The mutation body. Absent for a read-only step of an already pinned intent. */
  body?: string;
  /** Unix seconds. Checked against the pin for an order scan. */
  minTs?: number;
  nowMs: number;
  /** The user confirmed this intent on screen. Required for the first signature. */
  confirmed: boolean;
}

const isPinnedIntent = (value: unknown): value is PinnedIntent => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as PinnedIntent;
  return (
    typeof record.operation === 'string' &&
    typeof record.bodyDigest === 'string' &&
    Number.isSafeInteger(record.signCount) &&
    Number.isSafeInteger(record.pinnedAt)
  );
};

const readLedger = async (
  nowMs: number,
): Promise<Record<string, PinnedIntent>> => {
  const item = await SecureKeychain.getSecureItem(LEDGER_SCOPE);
  if (!item?.value) {
    return {};
  }
  try {
    const parsed = JSON.parse(item.value) as LedgerFile;
    if (parsed?.v !== LEDGER_VERSION || typeof parsed.entries !== 'object') {
      return {};
    }
    const live: Record<string, PinnedIntent> = {};
    for (const [key, entry] of Object.entries(parsed.entries)) {
      if (
        isPinnedIntent(entry) &&
        nowMs - entry.pinnedAt <= APPROVED_INTENT_TTL_MS
      ) {
        live[key] = entry;
      }
    }
    return live;
  } catch {
    return {};
  }
};

const writeLedger = async (
  entries: Record<string, PinnedIntent>,
): Promise<void> => {
  const stored = await SecureKeychain.setSecureItem(
    LEDGER_ACCOUNT,
    JSON.stringify({ v: LEDGER_VERSION, entries }),
    LEDGER_SCOPE,
  );
  if (stored === false) {
    throw new TemplateError('confirmation', 'ledger');
  }
};

/** Drops every pinned intent. Lock, wallet reset, and SRP change call this. */
export const clearApprovedIntents = async (): Promise<void> => {
  try {
    await SecureKeychain.clearSecureScope(LEDGER_SCOPE);
  } catch (error) {
    Logger.error(
      ensureError(error, 'clearApprovedIntents'),
      'PredictNext: failed to clear approved intents',
    );
  }
};

const scanFitsPin = (minTs: number, pinnedAt: number): boolean => {
  const pinnedSec = Math.floor(pinnedAt / 1000);
  return minTs <= pinnedSec && minTs >= pinnedSec - SCAN_LOOKBACK_SEC;
};

/**
 * Allows one signature of a per-intent operation. The first signature needs
 * `confirmed`. A later one needs no new confirmation only when it signs the
 * same body, the sign count is under the limit, and the pin has not expired.
 */
export const claimIntentSignature = async (
  claim: IntentSignatureClaim,
): Promise<void> => {
  const entries = await readLedger(claim.nowMs);
  const current = entries[claim.idempotencyKey];
  const live =
    current !== undefined &&
    current.operation === claim.operation &&
    claim.nowMs - current.pinnedAt <= APPROVED_INTENT_TTL_MS
      ? current
      : undefined;

  if (claim.body === undefined) {
    if (
      !live ||
      (claim.minTs !== undefined && !scanFitsPin(claim.minTs, live.pinnedAt))
    ) {
      throw new TemplateError('confirmation', claim.operation);
    }
    return;
  }

  const digest = contentDigest(claim.body);
  if (
    live &&
    live.bodyDigest === digest &&
    live.signCount < APPROVED_INTENT_SIGN_LIMIT
  ) {
    entries[claim.idempotencyKey] = {
      ...live,
      signCount: live.signCount + 1,
    };
    await writeLedger(entries);
    return;
  }
  if (!claim.confirmed) {
    throw new TemplateError('confirmation', claim.operation);
  }
  entries[claim.idempotencyKey] = {
    operation: claim.operation,
    bodyDigest: digest,
    signCount: 1,
    pinnedAt: claim.nowMs,
  };
  await writeLedger(entries);
};
