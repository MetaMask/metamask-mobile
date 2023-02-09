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
import AnalyticsV2 from '../../../../util/analyticsV2';

// Internal dependencies.
import { AccountPermissionsRevokeProps } from './AccountPermissionsRevoke.types';
import styleSheet from './AccountPermissionsRevoke.styles';
import { useSelector } from 'react-redux';

const AccountPermissionsRevoke = ({
  ensByAccountAddress,
  accounts,
  isLoading,
  permittedAddresses,
  onSetPermissionsScreen,
  hostname,
  favicon,
  secureIcon,
  accountAvatarType,
}: AccountPermissionsRevokeProps) => {
  const Engine = UntypedEngine as any;
  const { styles } = useStyles(styleSheet, {});
  const activeAddress = permittedAddresses[0];
  const { toastRef } = useContext(ToastContext);

  const accountsLength = useSelector(
    (state: any) =>
      Object.keys(
        state.engine.backgroundState.AccountTrackerController.accounts || {},
      ).length,
  );

  const nonTestnetNetworks = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.frequentRpcList
        .length + 1,
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
      <View style={styles.sheetActionContainer}>
        <SheetActions
          actions={[
            {
              label: strings('accounts.revoke_all'),
              onPress: revokeAllAccounts,
              disabled: isLoading,
              isDanger: true,
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
        title={strings('accounts.connected_accounts_title')}
        onBack={() =>
          onSetPermissionsScreen(AccountPermissionsScreens.Connected)
        }
      />
      <View style={styles.body}>
        <TagUrl imageSource={favicon} label={hostname} iconName={secureIcon} />
        <Text style={styles.description}>
          {strings('accounts.connect_description')}
        </Text>
      </View>
      <AccountSelectorList
        renderRightAccessory={(address, name) => (
          <Button
            variant={ButtonVariants.Secondary}
            isDanger
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
                  { label: strings('toast.revoked') },
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
            label={strings('accounts.revoke')}
            size={ButtonSize.Sm}
            style={styles.disconnectButton}
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
