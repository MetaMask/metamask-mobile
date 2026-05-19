import { RootMessenger } from '../types';
import { CryptographicFunctions } from '@metamask/key-tree';
import { encodeMnemonic } from '@metamask/keyring-sdk';
import { KeyringTypes } from '@metamask/keyring-controller';
import {
  QrKeyring,
  QrKeyringDeferredPromiseBridge,
} from '@metamask/eth-qr-keyring';
import {
  LedgerKeyring,
  LedgerMobileBridge,
  LedgerTransportMiddleware,
} from '@metamask/eth-ledger-bridge-keyring';
import { HdKeyring } from '@metamask/eth-hd-keyring';
import { MoneyKeyring } from '@metamask/eth-money-keyring';
import { hmacSha512 } from '@metamask/native-utils';
import { pbkdf2 } from '../../Encryptor';
import { snapKeyringBuilder } from '../../SnapKeyring';
import { SnapKeyringBuilderMessenger } from '../../SnapKeyring/types';
import { Messenger } from '@metamask/messenger';
import { store } from '../../../store';
import {
  scanCompleted,
  scanRequested,
} from '../../redux/slices/qrKeyringScanner';

export function getKeyringBuilders(messenger: RootMessenger) {
  // Required by the HD keyring and money keyring to use native crypto functions.
  const cryptographicFunctions: CryptographicFunctions = {
    pbkdf2Sha512: pbkdf2,
    hmacSha512: async (key, data) => hmacSha512(key, data),
  };

  const keyrings = [];

  const qrKeyringScanner = new QrKeyringDeferredPromiseBridge({
    onScanRequested: (request) => {
      store.dispatch(scanRequested(request));
    },
    onScanResolved: () => {
      store.dispatch(scanCompleted());
    },
    onScanRejected: () => {
      store.dispatch(scanCompleted());
    },
  });

  const qrKeyringBuilder = () => {
    const keyring = new QrKeyring({ bridge: qrKeyringScanner });
    // To fix the bug in #9560, forgetDevice will reset all keyring properties
    // to default.
    keyring.forgetDevice();
    return keyring;
  };

  qrKeyringBuilder.type = QrKeyring.type;

  keyrings.push(qrKeyringBuilder);

  const bridge = new LedgerMobileBridge(new LedgerTransportMiddleware());
  const ledgerKeyringBuilder = () => new LedgerKeyring({ bridge });
  ledgerKeyringBuilder.type = LedgerKeyring.type;

  keyrings.push(ledgerKeyringBuilder);

  const hdKeyringBuilder = () =>
    new HdKeyring({
      cryptographicFunctions,
    });
  hdKeyringBuilder.type = HdKeyring.type;
  keyrings.push(hdKeyringBuilder);

  // The builder is always registered so the KeyringController can recognise the
  // MoneyKeyring type during vault deserialization (even if the feature flag is
  // disabled at that time).
  const moneyKeyringBuilder = () =>
    new MoneyKeyring({
      cryptographicFunctions,
      getMnemonic: async (entropySource: string) =>
        messenger.call(
          'KeyringController:withKeyringUnsafe',
          {
            filter: (keyring, metadata): keyring is HdKeyring =>
              keyring.type === KeyringTypes.hd && metadata.id === entropySource,
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
  keyrings.push(moneyKeyringBuilder);

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)

  const snapKeyringMessenger: SnapKeyringBuilderMessenger = new Messenger({
    namespace: 'SnapKeyring',
    parent: messenger,
  });

  messenger.delegate({
    messenger: snapKeyringMessenger,
    actions: [
      'ApprovalController:addRequest',
      'ApprovalController:acceptRequest',
      'ApprovalController:rejectRequest',
      'ApprovalController:startFlow',
      'ApprovalController:endFlow',
      'ApprovalController:showSuccess',
      'ApprovalController:showError',
      'PhishingController:testOrigin',
      'PhishingController:maybeUpdateState',
      'KeyringController:getAccounts',
      'KeyringController:persistAllKeyrings',
      'AccountsController:setSelectedAccount',
      'AccountsController:getAccountByAddress',
      'AccountsController:setAccountName',
      'AccountsController:listMultichainAccounts',
      'SnapController:handleRequest',
      'SnapController:getSnap',
      'SnapController:isMinimumPlatformVersion',
    ],
  });

  keyrings.push(snapKeyringBuilder(snapKeyringMessenger));
  ///: END:ONLY_INCLUDE_IF

  return keyrings;
}
