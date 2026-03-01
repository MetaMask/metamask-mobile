import {
  buildSnapEndowmentSpecifications,
  buildSnapRestrictedMethodSpecifications,
} from '@metamask/snaps-rpc-methods';
import { keyringSnapPermissionsBuilder } from '../../SnapKeyring/keyringSnapsPermissions';
import { ControllerGetStateAction } from '@metamask/base-controller';
import { Messenger } from '@metamask/messenger';
import {
  ClearSnapState,
  CreateInterface,
  GetInterface,
  GetSnap,
  GetSnapState,
  HandleSnapRequest,
  UpdateInterface,
  UpdateSnapState,
} from '@metamask/snaps-controllers';
import { CurrencyRateController } from '@metamask/assets-controllers';
import {
  KeyringControllerGetKeyringsByTypeAction,
  KeyringControllerGetStateAction,
  KeyringControllerUnlockEvent,
  KeyringControllerWithKeyringAction,
  KeyringMetadata,
  KeyringTypes,
} from '@metamask/keyring-controller';
import { MaybeUpdateState, TestOrigin } from '@metamask/phishing-controller';
import { PreferencesControllerGetStateAction } from '@metamask/preferences-controller';
import { HdKeyring } from '@metamask/eth-hd-keyring';
import { DialogType, EnumToUnion } from '@metamask/snaps-sdk';
import {
  AddApprovalOptions,
  AddApprovalRequest,
} from '@metamask/approval-controller';
import Logger from '../../../util/Logger';
import { HasPermission } from '@metamask/permission-controller';
import { hmacSha512 } from '@metamask/native-utils';
import { pbkdf2 } from '../../Encryptor';
import I18n from '../../../../locales/i18n';
import {
  ExcludedSnapEndowments,
  ExcludedSnapPermissions,
} from './permissions.ts';

export type SnapPermissionSpecificationsActions =
  | AddApprovalRequest
  | ClearSnapState
  | ControllerGetStateAction<
      'CurrencyRateController',
      CurrencyRateController['state']
    >
  | CreateInterface
  | GetInterface
  | GetSnap
  | GetSnapState
  | HandleSnapRequest
  | KeyringControllerGetKeyringsByTypeAction
  | KeyringControllerWithKeyringAction
  | MaybeUpdateState
  | PreferencesControllerGetStateAction
  | TestOrigin
  | UpdateSnapState
  | UpdateInterface
  | KeyringControllerGetStateAction
  | HasPermission;

export type SnapPermissionSpecificationsEvents = KeyringControllerUnlockEvent;

interface SnapPermissionSpecificationsHooks {
  addNewKeyring(
    type: KeyringTypes | string,
    opts?: unknown,
  ): Promise<KeyringMetadata>;
}

export const getSnapPermissionSpecifications = (
  messenger: Messenger<
    'SnapPermissionSpecificationsMessenger',
    SnapPermissionSpecificationsActions,
    SnapPermissionSpecificationsEvents
  >,
  { addNewKeyring }: SnapPermissionSpecificationsHooks,
) => {
  /**
   * Gets the mnemonic of the user's primary keyring.
   */
  const getPrimaryKeyringMnemonic = () => {
    const [keyring] = messenger.call(
      'KeyringController:getKeyringsByType',
      KeyringTypes.hd,
    ) as HdKeyring[];

    if (!keyring.mnemonic) {
      throw new Error('Primary keyring mnemonic unavailable.');
    }

    return keyring.mnemonic;
  };

  const getPrimaryKeyringMnemonicSeed = () => {
    const [keyring] = messenger.call(
      'KeyringController:getKeyringsByType',
      KeyringTypes.hd,
    ) as HdKeyring[];

    if (!keyring.seed) {
      throw new Error('Primary keyring mnemonic unavailable.');
    }

    return keyring.seed;
  };

  const getUnlockPromise = () => {
    if (messenger.call('KeyringController:getState').isUnlocked) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      const callback = () => {
        messenger.unsubscribe('KeyringController:unlock', callback);
        resolve();
      };

      messenger.subscribe('KeyringController:unlock', callback);
    });
  };

  const snapRestrictedMethods = {
    clearSnapState: messenger.call.bind(
      messenger,
      'SnapController:clearSnapState',
    ),
    getMnemonic: async (source?: string) => {
      if (!source) {
        return getPrimaryKeyringMnemonic();
      }

      try {
        const { type, mnemonic } = (await messenger.call(
          'KeyringController:withKeyring',
          {
            id: source,
          },
          async ({ keyring }) => ({
            type: keyring.type,
            mnemonic: (keyring as unknown as HdKeyring).mnemonic,
          }),
        )) as { type: string; mnemonic?: Uint8Array };

        if (type !== KeyringTypes.hd || !mnemonic) {
          // The keyring isn't guaranteed to have a mnemonic (e.g.,
          // hardware wallets, which can't be used as entropy sources),
          // so we throw an error if it doesn't.
          throw new Error(`Entropy source with ID "${source}" not found.`);
        }

        return mnemonic;
      } catch {
        throw new Error(`Entropy source with ID "${source}" not found.`);
      }
    },
    getMnemonicSeed: async (source?: string) => {
      if (!source) {
        return getPrimaryKeyringMnemonicSeed();
      }

      try {
        const { type, seed } = (await messenger.call(
          'KeyringController:withKeyring',
          {
            id: source,
          },
          async ({ keyring }) => ({
            type: keyring.type,
            seed: (keyring as unknown as HdKeyring).seed,
          }),
        )) as { type: string; seed?: Uint8Array };

        if (type !== KeyringTypes.hd || !seed) {
          // The keyring isn't guaranteed to have a seed (e.g.,
          // hardware wallets, which can't be used as entropy sources),
          // so we throw an error if it doesn't.
          throw new Error(`Entropy source with ID "${source}" not found.`);
        }

        return seed;
      } catch {
        throw new Error(`Entropy source with ID "${source}" not found.`);
      }
    },
    getUnlockPromise: getUnlockPromise.bind(this),
    getSnap: messenger.call.bind(messenger, 'SnapController:get'),
    handleSnapRpcRequest: messenger.call.bind(
      messenger,
      'SnapController:handleRequest',
    ),
    getSnapState: messenger.call.bind(messenger, 'SnapController:getSnapState'),
    updateSnapState: messenger.call.bind(
      messenger,
      'SnapController:updateSnapState',
    ),
    maybeUpdatePhishingList: messenger.call.bind(
      messenger,
      'PhishingController:maybeUpdateState',
    ),
    isOnPhishingList: (origin: string) =>
      messenger.call('PhishingController:testOrigin', origin).result,
    showDialog: (
      origin: string,
      type: EnumToUnion<DialogType>,
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      content: any, // should be Component from '@metamask/snaps-ui';
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      placeholder?: any,
    ) =>
      messenger.call(
        'ApprovalController:addRequest',
        {
          origin,
          type,
          requestData: { content, placeholder },
        },
        true,
      ),
    showInAppNotification: (origin: string, args: unknown) => {
      Logger.log(
        'Snaps/ showInAppNotification called with args: ',
        args,
        ' and origin: ',
        origin,
      );

      return null;
    },
    createInterface: messenger.call.bind(
      messenger,
      'SnapInterfaceController:createInterface',
    ),
    getInterface: messenger.call.bind(
      messenger,
      'SnapInterfaceController:getInterface',
    ),
    updateInterface: messenger.call.bind(
      messenger,
      'SnapInterfaceController:updateInterface',
    ),
    requestUserApproval: (opts: AddApprovalOptions) =>
      messenger.call('ApprovalController:addRequest', opts, true),
    hasPermission: (origin: string, target: string) =>
      messenger.call('PermissionController:hasPermission', origin, target),
    getClientCryptography: () => ({
      pbkdf2Sha512: pbkdf2,
      hmacSha512: async (key: Uint8Array, data: Uint8Array) =>
        hmacSha512(key, data),
    }),
    getPreferences: () => {
      const {
        securityAlertsEnabled,
        useTransactionSimulations,
        useTokenDetection,
        privacyMode,
        useNftDetection,
        displayNftMedia,
        isMultiAccountBalancesEnabled,
        showTestNetworks,
      } = messenger.call('PreferencesController:getState');
      const { currentCurrency } = messenger.call(
        'CurrencyRateController:getState',
      );

      const locale = I18n.locale;
      return {
        locale,
        currency: currentCurrency,
        hideBalances: privacyMode,
        useSecurityAlerts: securityAlertsEnabled,
        simulateOnChainActions: useTransactionSimulations,
        useTokenDetection,
        batchCheckBalances: isMultiAccountBalancesEnabled,
        displayNftMedia,
        useNftDetection,
        useExternalPricingData: true,
        showTestnets: showTestNetworks,
      };
    },
  };

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  const getSnapKeyring = async () => {
    // TODO: Replace `getKeyringsByType` with `withKeyring`
    let [snapKeyring] = messenger.call(
      'KeyringController:getKeyringsByType',
      KeyringTypes.snap,
    );

    if (!snapKeyring) {
      await addNewKeyring(KeyringTypes.snap);
      // TODO: Replace `getKeyringsByType` with `withKeyring`
      [snapKeyring] = messenger.call(
        'KeyringController:getKeyringsByType',
        KeyringTypes.snap,
      );
    }

    return snapKeyring;
  };

  const keyringSnapMethods = {
    getAllowedKeyringMethods: (origin: string) =>
      keyringSnapPermissionsBuilder(origin),
    getSnapKeyring,
  };
  ///: END:ONLY_INCLUDE_IF

  return {
    ...buildSnapEndowmentSpecifications(Object.keys(ExcludedSnapEndowments)),
    ...buildSnapRestrictedMethodSpecifications(
      Object.keys(ExcludedSnapPermissions),
      {
        ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
        ...snapRestrictedMethods,
        ///: END:ONLY_INCLUDE_IF
        ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
        ...keyringSnapMethods,
        ///: END:ONLY_INCLUDE_IF
      },
    ),
  };
};
