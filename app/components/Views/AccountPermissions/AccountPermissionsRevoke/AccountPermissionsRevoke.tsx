// Third party dependencies.
import React, { useCallback, useContext } from 'react';
import { Platform, View } from 'react-native';

// External dependencies.
import SheetActions from '../../../../component-library/components-temp/SheetActions';
import SheetHeader from '../../../../component-library/components/Sheet/SheetHeader';
import { strings } from '../../../../../locales/i18n';
import TagUrl from '../../../../component-library/components/Tags/TagUrl';
import Text from '../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../component-library/hooks';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';
import AccountSelectorList from '../../../../components/UI/AccountSelectorList';
import { removePermittedAccounts } from '../../../../core/Permissions';
import UntypedEngine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import { ToastOptions } from '../../../../component-library/components/Toast/Toast.types';
import { AccountPermissionsScreens } from '../AccountPermissions.types';
import getAccountNameWithENS from '../../../../util/accounts';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import AnalyticsV2 from '../../../../util/analyticsV2';
import { selectAccountsLength } from '../../../../selectors/accountTrackerController';
import { selectFrequentRpcList } from '../../../../selectors/preferencesController';

// Internal dependencies.
import { AccountPermissionsRevokeProps } from './AccountPermissionsRevoke.types';
import styleSheet from './AccountPermissionsRevoke.styles';
import { useSelector } from 'react-redux';
import generateTestId from '../../../../../wdio/utils/generateTestId';
import {
  CONNECTED_ACCOUNTS_MODAL_DISCONNECT_ALL_BUTTON_ID,
  CONNECTED_ACCOUNTS_MODAL_REVOKE_BUTTON_ID,
} from '../../../../../wdio/screen-objects/testIDs/Components/ConnectedAccountsModal.testIds';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import Avatar from '../../../../component-library/components/Avatars/Avatar/Avatar';
import { AvatarVariants } from '../../../../component-library/components/Avatars/Avatar';

const AccountPermissionsRevoke = ({
  ensByAccountAddress,
  accounts,
  isLoading,
  permittedAddresses,
  onSetPermissionsScreen,
  hostname,
  urlWithProtocol,
  favicon,
  secureIcon,
  accountAvatarType,
}: AccountPermissionsRevokeProps) => {
  const Engine = UntypedEngine as any;
  const { styles } = useStyles(styleSheet, {});
  const activeAddress = permittedAddresses[0];
  const { toastRef } = useContext(ToastContext);

  const accountsLength = useSelector(selectAccountsLength);

  const nonTestnetNetworks = useSelector(
    (state: any) => selectFrequentRpcList(state).length + 1,
  );

  const revokeAllAccounts = useCallback(
    async () => {
      try {
        await Engine.context.PermissionController.revokeAllPermissions(
          hostname,
        );
        AnalyticsV2.trackEvent(
          MetaMetricsEvents.REVOKE_ACCOUNT_DAPP_PERMISSIONS,
          {
            number_of_accounts: accountsLength,
            number_of_accounts_connected: permittedAddresses.length,
            number_of_networks: nonTestnetNetworks,
          },
        );
      } catch (e) {
        Logger.log(`Failed to revoke all accounts for ${hostname}`, e);
      }
    },
    /* eslint-disable-next-line */
    [hostname],
  );

  const renderSheetAction = useCallback(
    () => (
      <View
        style={styles.sheetActionContainer}
        {...generateTestId(
          Platform,
          CONNECTED_ACCOUNTS_MODAL_DISCONNECT_ALL_BUTTON_ID,
        )}
      >
        <SheetActions
          actions={[
            {
              label: strings('accounts.disconnect_all_accounts'),
              onPress: revokeAllAccounts,
              disabled: isLoading,
            },
          ]}
        />
      </View>
    ),
    [revokeAllAccounts, isLoading, styles],
  );

  return (
    <>
      <SheetHeader
        title={strings('accounts.permissions')}
        onBack={() =>
          onSetPermissionsScreen(AccountPermissionsScreens.Connected)
        }
      />
      <View style={styles.body}>
        <TagUrl
          imageSource={favicon}
          label={urlWithProtocol}
          iconName={secureIcon}
        />
        <Text style={styles.description}>
          {strings('accounts.site_permission_to')}
        </Text>
        <View style={styles.permissionContainer}>
          <Avatar variant={AvatarVariants.Icon} name={IconName.Eye} />
          <Text style={styles.permissionDescription}>
            {strings('accounts.address_balance_activity_permission')}
          </Text>
        </View>
        <View style={styles.securityContainer}>
          <Avatar variant={AvatarVariants.Icon} name={IconName.SecurityTick} />
          <Text style={styles.permissionDescription}>
            {strings('accounts.suggest_transactions')}
          </Text>
        </View>
      </View>
      <AccountSelectorList
        renderRightAccessory={(address, name) => (
          <Button
            variant={ButtonVariants.Secondary}
            onPress={() => {
              if (permittedAddresses.length === 1) {
                // Dismiss and show toast
                revokeAllAccounts();
              } else {
                const labelOptions: ToastOptions['labelOptions'] = [
                  {
                    label: `${name} `,
                    isBold: true,
                  },
                  { label: strings('toast.disconnected') },
                ];
                if (activeAddress === address) {
                  const nextActiveAddress = permittedAddresses[1];
                  const newActiveAccountName = getAccountNameWithENS({
                    accountAddress: nextActiveAddress,
                    accounts,
                    ensByAccountAddress,
                  });
                  removePermittedAccounts(hostname, [address]);
                  labelOptions.push(
                    {
                      label: `\n${newActiveAccountName} `,
                      isBold: true,
                    },
                    { label: strings('toast.now_active') },
                  );
                  toastRef?.current?.showToast({
                    variant: ToastVariants.Account,
                    labelOptions,
                    accountAddress: nextActiveAddress,
                    accountAvatarType,
                  });
                } else {
                  // Just disconnect
                  removePermittedAccounts(hostname, [address]);
                  toastRef?.current?.showToast({
                    variant: ToastVariants.Plain,
                    labelOptions,
                  });
                }
                AnalyticsV2.trackEvent(
                  MetaMetricsEvents.REVOKE_ACCOUNT_DAPP_PERMISSIONS,
                  {
                    number_of_accounts: accountsLength,
                    number_of_accounts_connected: permittedAddresses.length,
                    number_of_networks: nonTestnetNetworks,
                  },
                );
              }
            }}
            label={strings('accounts.disconnect')}
            size={ButtonSize.Sm}
            style={styles.disconnectButton}
            {...generateTestId(
              Platform,
              CONNECTED_ACCOUNTS_MODAL_REVOKE_BUTTON_ID,
            )}
          />
        )}
        isSelectionDisabled
        selectedAddresses={[]}
        accounts={accounts}
        ensByAccountAddress={ensByAccountAddress}
        isLoading={isLoading}
      />
      {renderSheetAction()}
    </>
  );
};

export default AccountPermissionsRevoke;
