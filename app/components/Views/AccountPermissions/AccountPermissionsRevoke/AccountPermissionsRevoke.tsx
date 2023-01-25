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
import { ButtonSecondaryVariants } from '../../../../component-library/components/Buttons/Button/variants/ButtonSecondary';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';
import AccountSelectorList from '../../../../components/UI/AccountSelectorList';
import { ButtonTertiaryVariants } from '../../../../component-library/components/Buttons/Button/variants/ButtonTertiary';
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

// Internal dependencies.
import { AccountPermissionsRevokeProps } from './AccountPermissionsRevoke.types';
import styleSheet from './AccountPermissionsRevoke.styles';

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

  const revokeAllAccounts = useCallback(
    async () => {
      try {
        await Engine.context.PermissionController.revokeAllPermissions(
          hostname,
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
              variant: ButtonTertiaryVariants.Danger,
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
            buttonSecondaryVariants={ButtonSecondaryVariants.Danger}
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
