// Third party dependencies.
import React, { useCallback, useContext } from 'react';
import { View } from 'react-native';

// External dependencies.
import SheetActions from '../../../../component-library/components-temp/SheetActions';
import { strings } from '../../../../../locales/i18n';
import { AccountPermissionsScreens } from '../AccountPermissions.types';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import getAccountNameWithENS from '../../../../util/accounts';
import { ConnectedAccountsSelectorsIDs } from '../../AccountConnect/ConnectedAccountModal.testIds';

// Internal dependencies.
import { AccountPermissionsConnectedProps } from './AccountPermissionsConnected.types';
import styles from './AccountPermissionsConnected.styles';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../component-library/components/Avatars/Avatar';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../component-library/components/Buttons/Button';
import Engine from '../../../../core/Engine';
import CaipAccountSelectorList from '../../../UI/CaipAccountSelectorList';
import { CaipAccountId, parseCaipAccountId } from '@metamask/utils';

const AccountPermissionsConnected = ({
  ensByAccountAddress,
  accounts,
  isLoading,
  selectedAddresses,
  onSetPermissionsScreen,
  onDismissSheet,
  hostname,
  favicon,
  accountAvatarType,
}: AccountPermissionsConnectedProps) => {
  const { toastRef } = useContext(ToastContext);

  const onConnectMoreAccounts = useCallback(() => {
    onSetPermissionsScreen(AccountPermissionsScreens.ConnectMoreAccounts);
  }, [onSetPermissionsScreen]);

  const switchActiveAccount = useCallback(
    (caipAccountId: CaipAccountId) => {
      const { address } = parseCaipAccountId(caipAccountId);
      Engine.setSelectedAddress(address);
      onDismissSheet();
      const activeAccountName = getAccountNameWithENS({
        caipAccountId,
        accounts,
        ensByAccountAddress,
      });
      toastRef?.current?.showToast({
        variant: ToastVariants.Account,
        labelOptions: [
          {
            label: `${activeAccountName} `,
            isBold: true,
          },
          { label: strings('toast.now_active') },
        ],
        accountAddress: address,
        accountAvatarType,
        hasNoTimeout: false,
      });
    },
    [
      onDismissSheet,
      accounts,
      ensByAccountAddress,
      toastRef,
      accountAvatarType,
    ],
  );

  const renderSheetAction = useCallback(
    () => (
      <View style={styles.sheetActionContainer}>
        <SheetActions
          actions={[
            {
              label: strings('accounts.connect_more_accounts'),
              onPress: onConnectMoreAccounts,
              disabled: isLoading,
              testID: ConnectedAccountsSelectorsIDs.CONNECT_ACCOUNTS_BUTTON,
            },
          ]}
        />
      </View>
    ),
    [onConnectMoreAccounts, isLoading],
  );

  return (
    <>
      <View style={styles.header}>
        <Avatar
          variant={AvatarVariant.Favicon}
          imageSource={favicon}
          size={AvatarSize.Md}
          style={styles.favicon}
        />
        <Text variant={TextVariant.HeadingMD}>{hostname}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.sectionTitle} variant={TextVariant.BodyMDMedium}>
          {strings('accounts.connected_accounts_title')}
        </Text>
      </View>
      <CaipAccountSelectorList
        onSelectAccount={switchActiveAccount}
        accounts={accounts}
        ensByAccountAddress={ensByAccountAddress}
        isLoading={isLoading}
        selectedAddresses={selectedAddresses}
        isRemoveAccountEnabled
      />
      {renderSheetAction()}
      <Button
        style={styles.managePermissionsButton}
        variant={ButtonVariants.Secondary}
        label={strings('permissions.manage_permissions')}
        size={ButtonSize.Lg}
        onPress={() => {
          onSetPermissionsScreen(AccountPermissionsScreens.PermissionsSummary);
        }}
        testID={ConnectedAccountsSelectorsIDs.MANAGE_PERMISSIONS}
        width={ButtonWidthTypes.Full}
      />
    </>
  );
};

export default AccountPermissionsConnected;
