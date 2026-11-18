import Engine from '../Engine';
import Logger from '../../util/Logger';

/**
 * Records a passkey this device enrolled, so recovery accepts it. A failure
 * does not fail the enrollment: recovery setup skips passkeys never recorded.
 *
 * @param attestationObject - The passkey's base64url `attestationObject`.
 */
export async function trustPasskey(attestationObject: string): Promise<void> {
  try {
    await Engine.context.MfaRecoveryController.trustIdentifier({
      type: 'passkey',
      attestationObject,
    });
  } catch (error) {
    Logger.error(error as Error, { tags: { feature: 'mfa' } });
  }
}
