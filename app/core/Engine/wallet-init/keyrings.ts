import { RootMessenger } from '../types';
import { CryptographicFunctions } from '@metamask/key-tree';
import { encodeMnemonic } from '@metamask/keyring-sdk';
import {
  KeyringControllerOptions,
  KeyringV2Builder,
} from '@metamask/keyring-controller';
import { KeyringType } from '@metamask/keyring-api/v2';
import {
  QrKeyring,
  QrKeyringDeferredPromiseBridge,
} from '@metamask/eth-qr-keyring';
import { QrKeyring as QrKeyringV2 } from '@metamask/eth-qr-keyring/v2';
import {
  LedgerKeyring,
  LedgerMobileBridge,
  LedgerTransportMiddleware,
} from '@metamask/eth-ledger-bridge-keyring';
import { LedgerKeyring as LedgerKeyringV2 } from '@metamask/eth-ledger-bridge-keyring/v2';
import { HdKeyring } from '@metamask/eth-hd-keyring';
import { HdKeyring as HdKeyringV2 } from '@metamask/eth-hd-keyring/v2';
import { MoneyKeyring } from '@metamask/eth-money-keyring';
import { MoneyKeyring as MoneyKeyringV2 } from '@metamask/eth-money-keyring/v2';
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

// This is initialized globally as it is used in lots of UI contexts.
export const qrKeyringBridge = new QrKeyringDeferredPromiseBridge({
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

export function getKeyringBuilders(
  messenger: RootMessenger,
): KeyringControllerOptions['keyringBuilders'] {
  // Required by the HD keyring and money keyring to use native crypto functions.
  const cryptographicFunctions: CryptographicFunctions = {
    pbkdf2Sha512: pbkdf2,
    hmacSha512: async (key, data) => hmacSha512(key, data),
  };

  const keyrings = [];

  const qrKeyringBuilder = () => {
    const keyring = new QrKeyring({ bridge: qrKeyringBridge });
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
          'KeyringController:withKeyringV2Unsafe',
          {
            filter: (keyring, metadata) =>
              keyring.type === KeyringType.Hd && metadata.id === entropySource,
          },
          async ({ keyring }) => {
            const hdKeyring = keyring as unknown as HdKeyringV2;
            if (!hdKeyring?.mnemonic) {
              throw new Error(
                `Unable to get mnemonic to initialize MoneyKeyring`,
              );
            }

            return encodeMnemonic(hdKeyring.mnemonic);
          },
        ) as Promise<number[]>,
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
      'KeyringController:removeAccount',
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

  // @ts-expect-error: `addAccounts` is missing in `SnapKeyring` type.
  return keyrings;
}

/**
 * Wrap a hardware-keyring V2 class as a `KeyringV2Builder` keyed by the
 * matching legacy keyring's `type` string. The controller dispatches V2
 * builders by matching against the inner keyring's `type`, so `legacyType`
 * must equal `LegacyKeyring.type`.
 *
 * @param WrapperCtor - The V2 wrapper class to instantiate.
 * @param legacyType - The legacy keyring's `type` string.
 * @returns A `KeyringV2Builder`.
 */
function buildHardwareKeyringV2Builder<Wrapper, Legacy>(
  WrapperCtor: new (options: {
    legacyKeyring: Legacy;
    entropySource: string;
  }) => Wrapper,
  legacyType: string,
): KeyringV2Builder {
  const builder = Object.assign(
    (keyring: unknown, metadata: { id: string }) =>
      new WrapperCtor({
        legacyKeyring: keyring as Legacy,
        entropySource: metadata.id,
      }),
    { type: legacyType },
  );
  return builder as unknown as KeyringV2Builder;
}

/**
 * Wrap the MoneyKeyring V2 class as a `KeyringV2Builder`. The MoneyKeyring V2
 * constructor differs from the hardware wrappers in that it takes the legacy
 * keyring directly rather than an options object.
 *
 * @param WrapperCtor - The V2 wrapper class to instantiate.
 * @param legacyType - The legacy keyring's `type` string.
 * @returns A `KeyringV2Builder`.
 */
function buildMoneyKeyringV2Builder<Wrapper, Legacy>(
  WrapperCtor: new (inner: Legacy) => Wrapper,
  legacyType: string,
): KeyringV2Builder {
  const builder = Object.assign(
    (keyring: unknown) => new WrapperCtor(keyring as Legacy),
    { type: legacyType },
  );
  return builder as unknown as KeyringV2Builder;
}

export function getKeyringV2Builders(): KeyringControllerOptions['keyringV2Builders'] {
  return [
    buildHardwareKeyringV2Builder(LedgerKeyringV2, LedgerKeyring.type),
    buildHardwareKeyringV2Builder(QrKeyringV2, QrKeyring.type),
    buildMoneyKeyringV2Builder(MoneyKeyringV2, MoneyKeyring.type),
  ];
}
