import { QrKeyring as LegacyQrKeyring } from '@metamask/eth-qr-keyring';
import { QrKeyring } from '@metamask/eth-qr-keyring/v2';
import { KeyringMetadata } from '@metamask/keyring-controller';
import { KeyringType } from '@metamask/keyring-api/v2';
import Engine from '../Engine';

/**
 * Ensure a QR keyring exists in the controller before invoking a V2 operation.
 *
 * `withKeyringV2` has no `createIfMissing` option, so callers that need
 * on-demand creation perform the check + create inside `withController` so the
 * operation is serialized by the KeyringController mutex.
 */
async function ensureQrKeyringExists(): Promise<void> {
  const keyringController = Engine.context.KeyringController;
  await keyringController.withController(async (controller) => {
    const hasKeyring = controller.keyrings.some(
      ({ keyring }) => keyring.type === LegacyQrKeyring.type,
    );
    if (!hasKeyring) {
      await controller.addNewKeyring(LegacyQrKeyring.type);
    }
  });
}

/**
 * Perform an operation with the QR keyring.
 *
 * If no QR keyring is found, one is created.
 *
 * Note that the `operation` function should only be used for interactions with the keyring.
 * If you call KeyringController methods within this function, it could result in a deadlock.
 *
 * @param operation - The keyring operation to perform.
 * @returns The stored Qr Keyring
 * @throws If there is no QR keyring available or if the operation fails.
 */
export const withQrKeyring = async <CallbackResult = void>(
  operation: (selectedKeyring: {
    keyring: QrKeyring;
    metadata: KeyringMetadata;
  }) => Promise<CallbackResult>,
): Promise<CallbackResult> => {
  await ensureQrKeyringExists();
  return await Engine.context.KeyringController.withKeyringV2(
    { type: KeyringType.Qr },
    async ({ keyring, metadata }) => {
      if (!(keyring instanceof QrKeyring)) {
        throw new Error('Expected QrKeyring');
      }
      return operation({ keyring, metadata });
    },
  );
};

/**
 * Forget the QR keyring device, removing all accounts and
 * paired device information.
 */
export const forgetQrDevice = async () =>
  withQrKeyring(async ({ keyring }) => keyring.forgetDevice());
