import { QrKeyring } from '@metamask/eth-qr-keyring';
import { KeyringMetadata } from '@metamask/keyring-controller';
import Engine from '../Engine';
import ExtendedKeyringTypes from '../../constants/keyringTypes';

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
  await Engine.context.KeyringController.withKeyring(
    { type: ExtendedKeyringTypes.qr },
    operation,
    // TODO: Refactor this to stop creating the keyring on-demand
    // Instead create it only in response to an explicit user action, and do
    // not allow interactions with Qr Keyring until after that has been done.
    { createIfMissing: true },
  );

/**
 * Forget the QR keyring device, removing all accounts and
 * paired device information.
 */
export const forgetQrDevice = async () =>
  withQrKeyring(async ({ keyring }) => keyring.forgetDevice());
