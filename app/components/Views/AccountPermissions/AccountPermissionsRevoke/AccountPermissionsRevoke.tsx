// Third party dependencies.
import React, { useCallback, useContext } from 'react';
import { View } from 'react-native';

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
import { selectAccountsLength } from '../../../../selectors/accountTrackerController';

// Internal dependencies.
import { AccountPermissionsRevokeProps } from './AccountPermissionsRevoke.types';
import styleSheet from './AccountPermissionsRevoke.styles';
import { useSelector } from 'react-redux';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import Avatar from '../../../../component-library/components/Avatars/Avatar/Avatar';
import { AvatarVariant } from '../../../../component-library/components/Avatars/Avatar';
import { selectNetworkConfigurations } from '../../../../selectors/networkController';
import { ConnectedAccountsSelectorsIDs } from '../../../../../e2e/selectors/Modals/ConnectedAccountModal.selectors';
import { useMetrics } from '../../../../components/hooks/useMetrics';

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
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Engine = UntypedEngine as any;
  const { styles } = useStyles(styleSheet, {});
  const { trackEvent } = useMetrics();
  const activeAddress = permittedAddresses[0];
  const { toastRef } = useContext(ToastContext);

  const accountsLength = useSelector(selectAccountsLength);

  const nonTestnetNetworks = useSelector(
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (state: any) => Object.keys(selectNetworkConfigurations(state)).length + 1,
  );

  const revokeAllAccounts = useCallback(
    async () => {
      try {
        await Engine.context.PermissionController.revokeAllPermissions(
          hostname,
        );
        trackEvent(MetaMetricsEvents.REVOKE_ACCOUNT_DAPP_PERMISSIONS, {
          number_of_accounts: accountsLength,
          number_of_accounts_connected: permittedAddresses.length,
          number_of_networks: nonTestnetNetworks,
        });
      } catch (e) {
        Logger.log(`Failed to revoke all accounts for ${hostname}`, e);
      }
    },
    /* eslint-disable-next-line */
    [hostname, trackEvent],
  );

  const renderSheetAction = useCallback(
    () => (
      <View
        style={styles.sheetActionContainer}
        testID={ConnectedAccountsSelectorsIDs.DISCONNECT_ALL_BUTTON}
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
          <Avatar variant={AvatarVariant.Icon} name={IconName.Eye} />
          <Text style={styles.permissionDescription}>
            {strings('accounts.address_balance_activity_permission')}
          </Text>
        </View>
        <View style={styles.securityContainer}>
          <Avatar variant={AvatarVariant.Icon} name={IconName.SecurityTick} />
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
                if (activeAddress.toLowerCase() === address.toLowerCase()) {
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
                    labelOptions: [
                      {
                        label: `${name} `,
                        isBold: true,
                      },
                      { label: strings('toast.disconnected') },
                      {
                        label: `\n${newActiveAccountName} `,
                        isBold: true,
                      },
                      { label: strings('toast.now_active') },
                    ],
                    accountAddress: nextActiveAddress,
                    accountAvatarType,
                    hasNoTimeout: false,
                  });
                } else {
                  // Just disconnect
                  removePermittedAccounts(hostname, [address]);
                  toastRef?.current?.showToast({
                    variant: ToastVariants.Plain,
                    labelOptions: [
                      {
                        label: `${name} `,
                        isBold: true,
                      },
                      { label: strings('toast.disconnected') },
                    ],
                    hasNoTimeout: false,
                  });
                }
                trackEvent(MetaMetricsEvents.REVOKE_ACCOUNT_DAPP_PERMISSIONS, {
                  number_of_accounts: accountsLength,
                  number_of_accounts_connected: permittedAddresses.length,
                  number_of_networks: nonTestnetNetworks,
                });
              }
            }}
            label={strings('accounts.disconnect')}
            size={ButtonSize.Sm}
            style={styles.disconnectButton}
            testID={ConnectedAccountsSelectorsIDs.DISCONNECT_ALL_BUTTON}
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
