import { ControllerInitFunction } from '../types';
import {
  KeyringController,
  KeyringControllerMessenger,
} from '@metamask/keyring-controller';
import { QrKeyring } from '@metamask/eth-qr-keyring';
import {
  LedgerKeyring,
  LedgerMobileBridge,
  LedgerTransportMiddleware,
} from '@metamask/eth-ledger-bridge-keyring';
import { HdKeyring } from '@metamask/eth-hd-keyring';
import { hmacSha512 } from '@metamask/native-utils';
import { Encryptor, LEGACY_DERIVATION_OPTIONS, pbkdf2 } from '../../Encryptor';

const encryptor = new Encryptor({
  keyDerivationOptions: LEGACY_DERIVATION_OPTIONS,
});

/**
 * Initialize the keyring controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @param request.persistedState - The persisted state of the client.
 * @returns The initialized controller.
 */
export const keyringControllerInit: ControllerInitFunction<
  KeyringController,
  KeyringControllerMessenger
> = ({
  controllerMessenger,
  persistedState,
  initialKeyringState,
  qrKeyringScanner,
  getController,
}) => {
  const additionalKeyrings = [];

  const qrKeyringBuilder = () => {
    const keyring = new QrKeyring({ bridge: qrKeyringScanner });
    // To fix the bug in #9560, forgetDevice will reset all keyring properties
    // to default.
    keyring.forgetDevice();
    return keyring;
  };

  qrKeyringBuilder.type = QrKeyring.type;

  additionalKeyrings.push(qrKeyringBuilder);

  const bridge = new LedgerMobileBridge(new LedgerTransportMiddleware());
  const ledgerKeyringBuilder = () => new LedgerKeyring({ bridge });
  ledgerKeyringBuilder.type = LedgerKeyring.type;

  additionalKeyrings.push(ledgerKeyringBuilder);

  const hdKeyringBuilder = () =>
    new HdKeyring({
      cryptographicFunctions: {
        pbkdf2Sha512: pbkdf2,
        hmacSha512: async (key, data) => hmacSha512(key, data),
      },
    });

  hdKeyringBuilder.type = HdKeyring.type;
  additionalKeyrings.push(hdKeyringBuilder);

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  const snapKeyringBuilder = getController('SnapKeyringBuilder');
  additionalKeyrings.push(snapKeyringBuilder);
  ///: END:ONLY_INCLUDE_IF

  const preferencesController = getController('PreferencesController');

  const controller = new KeyringController({
    removeIdentity: (address: string) =>
      preferencesController.removeIdentity(address),
    encryptor,
    messenger: controllerMessenger,
    state: initialKeyringState || persistedState.KeyringController,
    // @ts-expect-error: TODO: Update the type of QRHardwareKeyring to
    // `Keyring<Json>`.
    keyringBuilders: additionalKeyrings,
  });

  return {
    controller,
  };
};
