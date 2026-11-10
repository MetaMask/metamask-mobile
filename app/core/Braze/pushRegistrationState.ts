import { BRAZE_PUSH_REGISTRATION_STATE } from '../../constants/storage';
import StorageWrapper from '../../store/storage-wrapper';

type BrazePushRegistrationState =
  | 'registered'
  | 'unregistered'
  | 'unregistration-pending';

const isBrazePushRegistrationState = (
  value: string | null,
): value is BrazePushRegistrationState =>
  value === 'registered' ||
  value === 'unregistered' ||
  value === 'unregistration-pending';

async function persistBrazePushRegistrationState(
  state: BrazePushRegistrationState,
): Promise<void> {
  await StorageWrapper.setItem(BRAZE_PUSH_REGISTRATION_STATE, state);
}

export function getBrazePushRegistrationState():
  | BrazePushRegistrationState
  | undefined {
  const storedState = StorageWrapper.getItemSync(BRAZE_PUSH_REGISTRATION_STATE);
  return isBrazePushRegistrationState(storedState) ? storedState : undefined;
}

export function hasPendingBrazePushUnregistrationSync(): boolean {
  return getBrazePushRegistrationState() === 'unregistration-pending';
}

/**
 * Record a newer explicit registration intent before enabling NaaP push.
 */
export async function markBrazePushRegistrationDesired(): Promise<void> {
  await persistBrazePushRegistrationState('registered');
}

export async function markBrazePushUnregistrationPending(): Promise<void> {
  await persistBrazePushRegistrationState('unregistration-pending');
}

export async function markBrazePushUnregistered(): Promise<void> {
  await persistBrazePushRegistrationState('unregistered');
}
