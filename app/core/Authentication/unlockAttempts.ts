import { FAILED_UNLOCK_ATTEMPTS } from '../../constants/storage';
import StorageWrapper from '../../store/storage-wrapper';

export const MAX_FAILED_UNLOCK_ATTEMPTS = 5;

export async function getFailedUnlockAttempts(): Promise<number> {
  const stored = await StorageWrapper.getItem(FAILED_UNLOCK_ATTEMPTS);
  const count = Number(stored);
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}

export async function recordFailedUnlockAttempt(): Promise<number> {
  const next = (await getFailedUnlockAttempts()) + 1;
  await StorageWrapper.setItem(FAILED_UNLOCK_ATTEMPTS, String(next));
  return next;
}

export async function resetFailedUnlockAttempts(): Promise<void> {
  await StorageWrapper.removeItem(FAILED_UNLOCK_ATTEMPTS);
}

export async function isUnlockLockedOut(): Promise<boolean> {
  const attempts = await getFailedUnlockAttempts();
  return attempts >= MAX_FAILED_UNLOCK_ATTEMPTS;
}
