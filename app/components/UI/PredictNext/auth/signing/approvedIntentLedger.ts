import SecureKeychain from '../../../../../core/SecureKeychain';
import Logger from '../../../../../util/Logger';
import { ensureError } from '../../../../../util/errorUtils';
import { contentDigest } from './deviceRequestSigner';
import { TemplateError } from './profileTemplates';

/** How long a confirmation stays valid. ADR-0004. */
export const APPROVED_INTENT_TTL_MS = 30 * 60 * 1000;

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
  /** Signatures allowed for one confirmed body. From the intent's rule. */
  signLimit: number;
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

const emptyEntries = (): Record<string, PinnedIntent> => Object.create(null);

/**
 * Claims and clears run one at a time, so two claims cannot both pass the
 * sign limit and a clear cannot interleave with a claim's read and write.
 */
let ledgerQueue: Promise<unknown> = Promise.resolve();

const serialized = <T>(task: () => Promise<T>): Promise<T> => {
  const run = ledgerQueue.then(task, task);
  ledgerQueue = run.catch(() => undefined);
  return run;
};

/**
 * Bumped synchronously by every clear. A claim that started before a clear
 * never succeeds, and its serialized write settles before the clear runs.
 */
let ledgerGeneration = 0;

const readLedger = async (
  nowMs: number,
): Promise<Record<string, PinnedIntent>> => {
  const item = await SecureKeychain.getSecureItem(LEDGER_SCOPE);
  if (!item?.value) {
    return emptyEntries();
  }
  try {
    const parsed = JSON.parse(item.value) as LedgerFile;
    if (
      parsed?.v !== LEDGER_VERSION ||
      typeof parsed.entries !== 'object' ||
      parsed.entries === null
    ) {
      return emptyEntries();
    }
    const live = emptyEntries();
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
    return emptyEntries();
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

/**
 * Drops every pinned intent. Lock, wallet reset, and SRP change call this.
 * A claim already in flight is refused rather than written after the clear.
 */
export const clearApprovedIntents = (): Promise<void> => {
  ledgerGeneration += 1;
  return serialized(async () => {
    try {
      await SecureKeychain.clearSecureScope(LEDGER_SCOPE);
    } catch (error) {
      Logger.error(
        ensureError(error, 'clearApprovedIntents'),
        'PredictNext: failed to clear approved intents',
      );
    }
  });
};

const claimInOrder = async (
  claim: IntentSignatureClaim,
  generation: number,
): Promise<void> => {
  const refuseIfCleared = (): void => {
    if (generation !== ledgerGeneration) {
      throw new TemplateError('confirmation', claim.operation);
    }
  };
  refuseIfCleared();
  const entries = await readLedger(claim.nowMs);
  refuseIfCleared();
  const current = entries[claim.idempotencyKey];
  const live =
    current?.operation === claim.operation &&
    claim.nowMs - current.pinnedAt <= APPROVED_INTENT_TTL_MS
      ? current
      : undefined;

  if (claim.body === undefined) {
    // No body to sign: the claim only checks that the intent is still
    // pinned live.
    if (!live) {
      throw new TemplateError('confirmation', claim.operation);
    }
    return;
  }

  const digest = contentDigest(claim.body);
  if (live?.bodyDigest === digest && live.signCount < claim.signLimit) {
    entries[claim.idempotencyKey] = {
      ...live,
      signCount: live.signCount + 1,
    };
    await writeLedger(entries);
    refuseIfCleared();
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
  refuseIfCleared();
};

/**
 * Allows one signature of a per-intent operation. The first signature needs
 * `confirmed`. A later one needs no new confirmation only when it signs the
 * same body, the sign count is under the limit, and the pin has not expired.
 */
export const claimIntentSignature = (
  claim: IntentSignatureClaim,
): Promise<void> => {
  const generation = ledgerGeneration;
  return serialized(() => claimInOrder(claim, generation));
};
