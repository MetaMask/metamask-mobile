import { RootMessenger } from '../types';
import { CryptographicFunctions } from '@metamask/key-tree';
import { encodeMnemonic } from '@metamask/keyring-sdk';
import {
  KeyringBuilder,
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
  LedgerDmkBridge,
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
import Logger from '../../../util/Logger';
import { getLegacySnapKeyringBuilderMessenger } from '../messengers/accounts/snap-keyring-builder-messenger';
import { getSnapKeyringV2BuilderMessenger } from '../messengers/accounts/snap-keyring-v2-builder-messenger';
import { store } from '../../../store';
import {
  scanCompleted,
  scanRequested,
} from '../../redux/slices/qrKeyringScanner';
import { RNBleTransportFactory } from '@ledgerhq/device-transport-kit-react-native-ble';
import {
  snapKeyringV2AdaptedAsV1Builder,
  snapKeyringV2Builder,
} from '../../SnapKeyring/SnapKeyringV2';
import { legacySnapKeyringBuilder } from '../../SnapKeyring/SnapKeyring';

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

/**
 * Build the list of keyring builders.
 *
 * @param messenger - Needed by some builders that interact with the shared bus.
 * TODO: Remove this parameter when we remove the DMK feature flag.
 * @param useDmk - Whether to use the DMK Ledger bridge for Ledger keyrings.
 * Read fresh from feature-flag state via `isDmkEnabled(flags)` (the `ledgerDmk`
 * flag) at engine init; the adapter factory reads the same flag in
 * `useAdapterLifecycle`.
 * @returns The keyring builders to register with the `KeyringController`.
 */
export function getKeyringBuilders(
  messenger: RootMessenger,
  useDmk: boolean,
): KeyringControllerOptions['keyringBuilders'] {
  // Required by the HD keyring and money keyring to use native crypto functions.
  const cryptographicFunctions: CryptographicFunctions = {
    pbkdf2Sha512: pbkdf2,
    hmacSha512: async (key, data) => hmacSha512(key, data),
  };

  const keyrings: KeyringBuilder[] = [];

  const qrKeyringBuilder = () => {
    const keyring = new QrKeyring({ bridge: qrKeyringBridge });
    // To fix the bug in #9560, forgetDevice will reset all keyring properties
    // to default.
    keyring.forgetDevice();
    return keyring;
  };

  qrKeyringBuilder.type = QrKeyring.type;

  keyrings.push(qrKeyringBuilder);

  const bridge = useDmk
    ? new LedgerDmkBridge({ transportFactory: RNBleTransportFactory })
    : new LedgerMobileBridge(new LedgerTransportMiddleware());
  Logger.log(
    `[Ledger] Using ${useDmk ? 'LedgerDmkBridge' : 'LedgerMobileBridge'}`,
  );
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
  const snapKeyringMessenger = getLegacySnapKeyringBuilderMessenger(messenger);
  // @ts-expect-error: `addAccounts` is missing in `SnapKeyring` type.
  keyrings.push(legacySnapKeyringBuilder(snapKeyringMessenger));

  // The v2 Snap keyring is registered via `KeyringV1Adapter`, which owns the
  // inner `SnapKeyring` (v2) instance and exposes a v1-compatible facade for
  // KeyringController vault management. The same inner instance is retrieved
  // via `unwrap()` for the v2 builder, so both entries share the same
  // underlying object — enabling both `withKeyring` and `withKeyringV2`.
  keyrings.push(snapKeyringV2AdaptedAsV1Builder(snapKeyringMessenger));
  ///: END:ONLY_INCLUDE_IF

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

/**
 * Build the list of V2 keyring builders.
 *
 * Each builder wraps the legacy keyring (created by
 * `getKeyringBuilders`) in its V2 wrapper, keyed by the legacy keyring's
 * `type` so the controller can resolve it via `withKeyringV2`.
 *
 * @returns The V2 keyring builders to register with the `KeyringController`.
 */
export function getKeyringV2Builders(): KeyringControllerOptions['keyringV2Builders'] {
  return [
    buildHardwareKeyringV2Builder(LedgerKeyringV2, LedgerKeyring.type),
    buildHardwareKeyringV2Builder(QrKeyringV2, QrKeyring.type),
    buildMoneyKeyringV2Builder(MoneyKeyringV2, MoneyKeyring.type),
    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    // The v2 Snap keyring is registered via `KeyringV1Adapter`, which owns the
    // inner `SnapKeyring` (v2) instance and exposes a v1-compatible facade for
    // KeyringController vault management. The same inner instance is retrieved
    // via `unwrap()` for the v2 builder, so both entries share the same
    // underlying object — enabling both `withKeyring` and `withKeyringV2`.
    snapKeyringV2Builder(),
    ///: END:ONLY_INCLUDE_IF
  ];
}
