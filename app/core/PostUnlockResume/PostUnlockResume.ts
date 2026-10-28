import Engine from '../Engine';
import StorageWrapper from '../../store/storage-wrapper';
import Logger from '../../util/Logger';
import ExtendedKeyringTypes from '../../constants/keyringTypes';
import type { NavigationBranchState } from '../DeeplinkManager/utils/resetToHomeNav';

const POST_UNLOCK_RESUME_KEY = '@MetaMask:postUnlockResume:v1';
const POST_UNLOCK_RESUME_COUNT_KEY = '@MetaMask:postUnlockResumeCount:v1';

/**
 * Automatic resumes allowed in a row for one owner, so a screen that crashes
 * the app cannot reopen itself forever.
 */
export const MAX_CONSECUTIVE_POST_UNLOCK_RESUMES = 2;

// New on every JS runtime, so only a later launch can consume a request.
const RUNTIME_ID = `${Date.now()}:${Math.random()}`;

export interface PostUnlockResumeRequest {
  /** Feature that owns the request; only that owner can clear it. */
  owner: string;
  /**
   * Main navigator state to open after the next cold-start unlock. Its screens
   * mount before Redux reflects the unlocked keyring, so they must wait for
   * any store data they read.
   */
  state: NavigationBranchState;
  /** How long after the last write a relaunch still resumes. */
  maxAgeMs: number;
}

interface StoredRequest extends PostUnlockResumeRequest {
  keyringId: string;
  runtimeId: string;
  updatedAt: number;
}

interface StoredCount {
  owner: string;
  count: number;
  lastAt: number;
}

const getPrimaryKeyringId = (): string | undefined =>
  Engine.context.KeyringController.state.keyrings.find(
    (keyring) => keyring.type === ExtendedKeyringTypes.hd,
  )?.metadata?.id;

const isWithin = (since: number, now: number, maxAgeMs: number): boolean => {
  const elapsedMs = now - since;
  return elapsedMs >= 0 && elapsedMs <= maxAgeMs;
};

const parseJson = <T>(serialized: string | null): Partial<T> | null => {
  if (!serialized) {
    return null;
  }
  try {
    return JSON.parse(serialized) as Partial<T>;
  } catch {
    return null;
  }
};

const parseRequest = (serialized: string | null): StoredRequest | null => {
  const parsed = parseJson<StoredRequest>(serialized);
  if (
    typeof parsed?.owner !== 'string' ||
    typeof parsed.keyringId !== 'string' ||
    typeof parsed.runtimeId !== 'string' ||
    typeof parsed.updatedAt !== 'number' ||
    typeof parsed.maxAgeMs !== 'number' ||
    !Array.isArray(parsed.state?.routes)
  ) {
    return null;
  }
  return parsed as StoredRequest;
};

const parseCount = (serialized: string | null): StoredCount | null => {
  const parsed = parseJson<StoredCount>(serialized);
  if (
    typeof parsed?.owner !== 'string' ||
    typeof parsed.count !== 'number' ||
    typeof parsed.lastAt !== 'number'
  ) {
    return null;
  }
  return parsed as StoredCount;
};

const logError = (error: unknown, step: string): void => {
  Logger.error(error as Error, {
    tags: { feature: 'post-unlock-resume' },
    context: { name: 'PostUnlockResume', data: { step } },
  });
};

/**
 * Asks the next cold-start unlock to open `state` instead of wallet home.
 * Call it again to refresh the timestamp, for example when the app goes to the
 * background. Only one request is kept; the latest write wins.
 */
export const setPostUnlockResume = async (
  request: PostUnlockResumeRequest,
): Promise<void> => {
  try {
    const keyringId = getPrimaryKeyringId();
    if (!keyringId) {
      return;
    }
    const stored: StoredRequest = {
      ...request,
      keyringId,
      runtimeId: RUNTIME_ID,
      updatedAt: Date.now(),
    };
    await StorageWrapper.setItem(
      POST_UNLOCK_RESUME_KEY,
      JSON.stringify(stored),
    );
  } catch (error) {
    logError(error, 'set');
  }
};

/** Drops the owner's request and its resume count once the flow returns. */
export const clearPostUnlockResume = async (owner: string): Promise<void> => {
  try {
    const request = parseRequest(
      await StorageWrapper.getItem(POST_UNLOCK_RESUME_KEY),
    );
    if (request?.owner === owner) {
      await StorageWrapper.removeItem(POST_UNLOCK_RESUME_KEY);
    }
    const count = parseCount(
      await StorageWrapper.getItem(POST_UNLOCK_RESUME_COUNT_KEY),
    );
    if (count?.owner === owner) {
      await StorageWrapper.removeItem(POST_UNLOCK_RESUME_COUNT_KEY);
    }
  } catch (error) {
    logError(error, 'clear');
  }
};

/**
 * Deletes a request left by a previous runtime and returns its state when it
 * was written for the same SRP within its `maxAgeMs`. A request from the
 * current runtime is left alone. After
 * {@link MAX_CONSECUTIVE_POST_UNLOCK_RESUMES} resumes in a row for one owner,
 * the next relaunch goes home instead.
 */
export const consumePostUnlockResume = async (): Promise<
  NavigationBranchState | undefined
> => {
  try {
    const serialized = await StorageWrapper.getItem(POST_UNLOCK_RESUME_KEY);
    if (serialized === null) {
      return undefined;
    }

    const request = parseRequest(serialized);
    if (request?.runtimeId === RUNTIME_ID) {
      return undefined;
    }
    await StorageWrapper.removeItem(POST_UNLOCK_RESUME_KEY);

    const now = Date.now();
    if (
      !request ||
      request.keyringId !== getPrimaryKeyringId() ||
      !isWithin(request.updatedAt, now, request.maxAgeMs)
    ) {
      return undefined;
    }

    const stored = parseCount(
      await StorageWrapper.getItem(POST_UNLOCK_RESUME_COUNT_KEY),
    );
    const count =
      stored?.owner === request.owner &&
      isWithin(stored.lastAt, now, request.maxAgeMs)
        ? stored.count
        : 0;
    if (count >= MAX_CONSECUTIVE_POST_UNLOCK_RESUMES) {
      return undefined;
    }
    await StorageWrapper.setItem(
      POST_UNLOCK_RESUME_COUNT_KEY,
      JSON.stringify({ owner: request.owner, count: count + 1, lastAt: now }),
    );
    return request.state;
  } catch (error) {
    logError(error, 'consume');
    return undefined;
  }
};
