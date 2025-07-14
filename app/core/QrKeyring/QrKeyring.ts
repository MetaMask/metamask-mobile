import { QrKeyring } from '@metamask/eth-qr-keyring';
import { KeyringMetadata } from '@metamask/keyring-controller';
import Engine from '../Engine';
import ExtendedKeyringTypes from 'app/constants/keyringTypes';

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
): Promise<CallbackResult> =>
  Engine.context.KeyringController.withKeyring(
    { type: ExtendedKeyringTypes.qr, index: 0 },
    operation,
  );

/**
 * Forget the QR keyring device, removing all accounts and
 * paired device information.
 */
export const forgetQrDevice = async () =>
  withQrKeyring(async ({ keyring }) => keyring.forgetDevice());
