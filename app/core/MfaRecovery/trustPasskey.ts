import Engine from '../Engine';
import StorageWrapper from '../../store/storage-wrapper';
import Logger from '../../util/Logger';

/** An enrolled passkey whose recording failed. */
interface PendingPasskey {
  /** The base64url credential ID. */
  credentialId: string;
  /** The base64url `attestationObject` from its creation. */
  attestationObject: string;
}

/**
 * Where enrolled passkeys whose recording failed are kept to retry. Per
 * profile, so another wallet on this device never records them.
 */
const pendingKey = async (): Promise<string> => {
  const { profileId } =
    await Engine.context.AuthenticationController.getSessionProfile();
  return `mfaRecoveryPendingPasskeyAttestations.${profileId}`;
};

const readPending = async (key: string): Promise<PendingPasskey[]> =>
  JSON.parse((await StorageWrapper.getItem(key)) ?? '[]');

const forget = async (key: string, credentialId: string): Promise<void> => {
  const remaining = (await readPending(key)).filter(
    (item) => item.credentialId !== credentialId,
  );
  await StorageWrapper.setItem(key, JSON.stringify(remaining));
};

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
 * @param passkey - The enrolled passkey.
 */
export async function trustPasskey(passkey: PendingPasskey): Promise<void> {
  try {
    await record(passkey.attestationObject);
  } catch (error) {
    Logger.error(error as Error, { tags: { feature: 'mfa' } });
    const key = await pendingKey();
    await StorageWrapper.setItem(
      key,
      JSON.stringify([...(await readPending(key)), passkey]),
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
  for (const { credentialId, attestationObject } of await readPending(key)) {
    await record(attestationObject);
    // Reread inside forget: an enrollment may have added one meanwhile.
    await forget(key, credentialId);
  }
}

/**
 * Drops a removed passkey that is still pending, so a retry cannot trust it.
 *
 * @param credentialId - The passkey's base64url credential ID.
 */
export async function forgetPendingPasskey(
  credentialId: string,
): Promise<void> {
  await forget(await pendingKey(), credentialId);
}
