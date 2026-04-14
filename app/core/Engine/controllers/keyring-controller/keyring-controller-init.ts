import { MessengerClientInitFunction } from '../../types';
import { isMoneyAccountEnabled } from '../../../../lib/Money/feature-flags';
import { CryptographicFunctions } from '@metamask/key-tree';
import { encodeMnemonic } from '@metamask/keyring-sdk';
import {
  KeyringController,
  KeyringControllerMessenger,
  KeyringTypes,
} from '@metamask/keyring-controller';
import { QrKeyring } from '@metamask/eth-qr-keyring';
import {
  LedgerKeyring,
  LedgerMobileBridge,
  LedgerTransportMiddleware,
} from '@metamask/eth-ledger-bridge-keyring';
import { HdKeyring } from '@metamask/eth-hd-keyring';
import { MoneyKeyring } from '@metamask/eth-money-keyring';
import { hmacSha512 } from '@metamask/native-utils';
import {
  Encryptor,
  LEGACY_DERIVATION_OPTIONS,
  pbkdf2,
} from '../../../Encryptor';

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
export const keyringControllerInit: MessengerClientInitFunction<
  KeyringController,
  KeyringControllerMessenger
> = ({
  controllerMessenger,
  persistedState,
  initialKeyringState,
  qrKeyringScanner,
  getMessengerClient,
}) => {
  const { remoteFeatureFlags } = getMessengerClient(
    'RemoteFeatureFlagController',
  ).state;

  // Required by the HD keyring and money keyring to use native crypto functions.
  const cryptographicFunctions: CryptographicFunctions = {
    pbkdf2Sha512: pbkdf2,
    hmacSha512: async (key, data) => hmacSha512(key, data),
  };

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
      cryptographicFunctions,
    });
  hdKeyringBuilder.type = HdKeyring.type;
  additionalKeyrings.push(hdKeyringBuilder);

  // We only need this keyring if Money accounts are enabled.
  if (isMoneyAccountEnabled(remoteFeatureFlags)) {
    const moneyKeyringBuilder = () =>
      new MoneyKeyring({
        cryptographicFunctions,
        getMnemonic: async (entropySource: string) =>
          // This builder needs the controller itself, so we re-use `getMessengerClient` to access
          // the controller instance as it will be available when this method gets called.
          // NOTE: This is required since we cannot self-use our own actions with the init messenger.
          getMessengerClient('KeyringController').withKeyringUnsafe(
            {
              filter: (keyring, metadata): keyring is HdKeyring =>
                keyring.type === KeyringTypes.hd &&
                metadata.id === entropySource,
            },
            async ({ keyring }) => {
              if (!keyring?.mnemonic) {
                throw new Error(
                  `Unable to get mnemonic to initialize MoneyKeyring`,
                );
              }

              return encodeMnemonic(keyring.mnemonic);
            },
          ),
      });
    moneyKeyringBuilder.type = MoneyKeyring.type;
    additionalKeyrings.push(moneyKeyringBuilder);
  }

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  const snapKeyringBuilder = getMessengerClient('SnapKeyringBuilder');
  additionalKeyrings.push(snapKeyringBuilder);
  ///: END:ONLY_INCLUDE_IF

  const messengerClient = new KeyringController({
    encryptor,
    messenger: controllerMessenger,
    state: initialKeyringState || persistedState.KeyringController,
    // @ts-expect-error: TODO: Update the type of QRHardwareKeyring to
    // `Keyring<Json>`.
    keyringBuilders: additionalKeyrings,
  });

  return {
    messengerClient,
  };
};
