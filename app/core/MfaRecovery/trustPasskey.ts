import Engine from '../Engine';
import StorageWrapper from '../../store/storage-wrapper';
import Logger from '../../util/Logger';

/**
 * Where attestations of enrolled passkeys whose recording failed are kept to
 * retry. Per profile, so another wallet on this device never records them.
 */
const pendingKey = async (): Promise<string> => {
  const { profileId } =
    await Engine.context.AuthenticationController.getSessionProfile();
  return `mfaRecoveryPendingPasskeyAttestations.${profileId}`;
};

const readPending = async (key: string): Promise<string[]> =>
  JSON.parse((await StorageWrapper.getItem(key)) ?? '[]');

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
    const key = await pendingKey();
    await StorageWrapper.setItem(
      key,
      JSON.stringify([...(await readPending(key)), attestationObject]),
    );
  }
}

/**
 * Records the current profile's passkeys {@link trustPasskey} could not.
 *
 * @throws If a write still fails; the rest stay pending.
 */
export async function retryPendingPasskeys(): Promise<void> {
  const key = await pendingKey();
  for (const attestationObject of await readPending(key)) {
    await record(attestationObject);
    // Reread: an enrollment may have added one meanwhile.
    const remaining = (await readPending(key)).filter(
      (item) => item !== attestationObject,
    );
    await StorageWrapper.setItem(key, JSON.stringify(remaining));
  }
}
