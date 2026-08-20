import {
  RestrictedMethodMessenger,
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
  KeyringControllerGetStateAction,
  KeyringControllerUnlockEvent,
  KeyringControllerWithKeyringAction,
  KeyringControllerWithKeyringV2UnsafeAction,
  KeyringTypes,
} from '@metamask/keyring-controller';
import { MaybeUpdateState, TestOrigin } from '@metamask/phishing-controller';
import { PreferencesControllerGetStateAction } from '@metamask/preferences-controller';
import { ApprovalControllerAddRequestAction } from '@metamask/approval-controller';
import { HasPermission } from '@metamask/permission-controller';
import { hmacSha512 } from '@metamask/native-utils';
import { pbkdf2 } from '../../Encryptor';
import I18n from '../../../../locales/i18n';
import { ExcludedSnapEndowments, ExcludedSnapPermissions } from './permissions';
import { SnapMessage } from '@metamask/eth-snap-keyring';
import { SnapId } from '@metamask/snaps-sdk';
import { SnapAccountServiceHandleKeyringSnapMessageAction } from '@metamask/snap-account-service';

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
  | KeyringControllerWithKeyringAction
  | KeyringControllerWithKeyringV2UnsafeAction
  | MaybeUpdateState
  | PreferencesControllerGetStateAction
  | TestOrigin
  | SnapControllerUpdateSnapStateAction
  | SnapInterfaceControllerUpdateInterfaceAction
  | KeyringControllerGetStateAction
  | HasPermission
  | SnapInterfaceControllerSetInterfaceDisplayedAction
  | SnapAccountServiceHandleKeyringSnapMessageAction;

export type SnapPermissionSpecificationsEvents = KeyringControllerUnlockEvent;

export const getSnapPermissionSpecifications = (
  messenger: Messenger<
    'SnapPermissionSpecificationsMessenger',
    SnapPermissionSpecificationsActions,
    SnapPermissionSpecificationsEvents
  >,
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
      getSnapKeyring: async () => ({
        // We only need a subset of the Snap keyring's functionality, and this message handling is now
        // owned by the Snap account service.
        handleKeyringSnapMessage(snapId: string, message: SnapMessage) {
          return messenger.call(
            'SnapAccountService:handleKeyringSnapMessage',
            snapId as SnapId,
            message,
          );
        },
      }),
      ///: END:ONLY_INCLUDE_IF
    },
    messenger as RestrictedMethodMessenger,
  ),
});
