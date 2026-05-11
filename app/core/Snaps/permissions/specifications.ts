import {
  buildSnapEndowmentSpecifications,
  buildSnapRestrictedMethodSpecifications,
} from '@metamask/snaps-rpc-methods';
import { ControllerGetStateAction } from '@metamask/base-controller';
import { Messenger } from '@metamask/messenger';
import {
  SnapControllerClearSnapStateAction,
  SnapInterfaceControllerCreateInterfaceAction,
  SnapInterfaceControllerGetInterfaceAction,
  SnapControllerGetSnapAction,
  SnapControllerGetSnapStateAction,
  SnapControllerHandleRequestAction,
  SnapInterfaceControllerSetInterfaceDisplayedAction,
  SnapInterfaceControllerUpdateInterfaceAction,
  SnapControllerUpdateSnapStateAction,
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
import { ApprovalControllerAddRequestAction } from '@metamask/approval-controller';
import Logger from '../../../util/Logger';
import { HasPermission } from '@metamask/permission-controller';
import { hmacSha512 } from '@metamask/native-utils';
import { pbkdf2 } from '../../Encryptor';
import I18n from '../../../../locales/i18n';
import { ExcludedSnapEndowments, ExcludedSnapPermissions } from './permissions';

export type SnapPermissionSpecificationsActions =
  | ApprovalControllerAddRequestAction
  | SnapControllerClearSnapStateAction
  | ControllerGetStateAction<
      'CurrencyRateController',
      CurrencyRateController['state']
    >
  | SnapInterfaceControllerCreateInterfaceAction
  | SnapInterfaceControllerGetInterfaceAction
  | SnapControllerGetSnapAction
  | SnapControllerGetSnapStateAction
  | SnapControllerHandleRequestAction
  | KeyringControllerGetKeyringsByTypeAction
  | KeyringControllerWithKeyringAction
  | MaybeUpdateState
  | PreferencesControllerGetStateAction
  | TestOrigin
  | SnapControllerUpdateSnapStateAction
  | SnapInterfaceControllerUpdateInterfaceAction
  | KeyringControllerGetStateAction
  | HasPermission
  | SnapInterfaceControllerSetInterfaceDisplayedAction;

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
) => ({
  ...buildSnapEndowmentSpecifications(Object.keys(ExcludedSnapEndowments)),
  ...buildSnapRestrictedMethodSpecifications(
    Object.keys(ExcludedSnapPermissions),
    {
      ///: BEGIN:ONLY_INCLUDE_IF(snaps)
      getUnlockPromise: async () => {
        if (messenger.call('KeyringController:getState').isUnlocked) {
          return;
        }

        await messenger.waitUntil('KeyringController:unlock');
      },
      maybeUpdatePhishingList: messenger.call.bind(
        messenger,
        'PhishingController:maybeUpdateState',
      ),
      isOnPhishingList: (origin: string) =>
        messenger.call('PhishingController:testOrigin', origin).result,
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
      ///: END:ONLY_INCLUDE_IF
      ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
      getSnapKeyring: async () => {
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
      },
      ///: END:ONLY_INCLUDE_IF
    },
    messenger,
  ),
});
