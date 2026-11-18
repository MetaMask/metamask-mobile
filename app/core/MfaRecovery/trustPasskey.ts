import Engine from '../Engine';
import StorageWrapper from '../../store/storage-wrapper';
import Logger from '../../util/Logger';

/** Attestations of enrolled passkeys whose recording failed, kept to retry. */
const PENDING_KEY = 'mfaRecoveryPendingPasskeyAttestations';

const readPending = async (): Promise<string[]> =>
  JSON.parse((await StorageWrapper.getItem(PENDING_KEY)) ?? '[]');

const record = (attestationObject: string) =>
  Engine.context.MfaRecoveryController.trustIdentifier({
    type: 'passkey',
    attestationObject,
  });

/**
 * Records a passkey this device enrolled, so recovery accepts it. The
 * attestation cannot be produced again, so a failed write keeps it on the
 * device for {@link retryPendingPasskeys} instead of failing the enrollment.
 *
 * @param attestationObject - The passkey's base64url `attestationObject`.
 */
export async function trustPasskey(attestationObject: string): Promise<void> {
  try {
    await record(attestationObject);
  } catch (error) {
    Logger.error(error as Error, { tags: { feature: 'mfa' } });
    const pending = await readPending();
    await StorageWrapper.setItem(
      PENDING_KEY,
      JSON.stringify([...pending, attestationObject]),
    );
  }
}

/**
 * Records the passkeys {@link trustPasskey} could not.
 *
 * @throws If a write still fails; the rest stay pending.
 */
export async function retryPendingPasskeys(): Promise<void> {
  const pending = await readPending();
  for (const attestationObject of pending) {
    await record(attestationObject);
    // Reread: an enrollment may have added one meanwhile.
    const remaining = (await readPending()).filter(
      (item) => item !== attestationObject,
    );
    await StorageWrapper.setItem(PENDING_KEY, JSON.stringify(remaining));
  }
}
