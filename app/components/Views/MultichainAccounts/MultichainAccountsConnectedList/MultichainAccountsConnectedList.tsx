// Third party dependencies.
import React, { useCallback, useContext, useMemo } from 'react';
import { View, ScrollViewProps } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import TouchableOpacity from '../../../Base/TouchableOpacity';

// external dependencies
import { strings } from '../../../../../locales/i18n';
import { useStyles } from '../../../../component-library/hooks';
import TextComponent, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { ConnectedAccountsSelectorsIDs } from '../../AccountConnect/ConnectedAccountModal.testIds';

// internal dependencies
import styleSheet from './MultichainAccountsConnectedList.styles';
import { AccountGroupObject } from '@metamask/account-tree-controller';
import { FlashList } from '@shopify/flash-list';
import AccountListCell from '../../../../component-library/components-temp/MultichainAccounts/MultichainAccountSelectorList/AccountListCell';
import Avatar, {
  AvatarVariant,
} from '../../../../component-library/components/Avatars/Avatar';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import Engine from '../../../../core/Engine';
import { useSelector } from 'react-redux';
import {
  selectAccountGroups,
  selectSelectedAccountGroup,
} from '../../../../selectors/multichainAccounts/accountTreeController';
import { ToastContext } from '../../../../component-library/components/Toast/Toast.context';
import { ToastVariants } from '../../../../component-library/components/Toast/Toast.types';
import { selectAvatarAccountType } from '../../../../selectors/settings';
import { RootState } from '../../../../reducers';
import { selectIconSeedAddressesByAccountGroupIds } from '../../../../selectors/multichainAccounts/accounts';
import Routes from '../../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';

const MultichainAccountsConnectedList = ({
  privacyMode,
  selectedAccountGroups,
  handleEditAccountsButtonPress,
  isConnectionFlow = false,
}: {
  privacyMode: boolean;
  selectedAccountGroups: AccountGroupObject[];
  handleEditAccountsButtonPress: () => void;
  isConnectionFlow?: boolean;
}) => {
  const { styles } = useStyles(styleSheet, {
    itemHeight: 64,
    numOfAccounts: selectedAccountGroups.length,
  });
  const { toastRef } = useContext(ToastContext);
  const accountAvatarType = useSelector(selectAvatarAccountType);
  const navigation = useNavigation();

  const selectedAccountGroup = useSelector(selectSelectedAccountGroup);
  const accountGroups = useSelector(selectAccountGroups);

  const accountGroupIds = useMemo(
    () => selectedAccountGroups.map((group) => group.id),
    [selectedAccountGroups],
  );

  const iconSeedAddresses = useSelector((state: RootState) =>
    selectIconSeedAddressesByAccountGroupIds(state, accountGroupIds),
  );

  const handleSelectAccount = useCallback(
    (accountGroup: AccountGroupObject) => {
      const { AccountTreeController } = Engine.context;
      AccountTreeController.setSelectedAccountGroup(accountGroup.id);

      // During connection flow, clicking an account should only change the selected account group instead of navigating
      if (isConnectionFlow) {
        return;
      }

      const address = iconSeedAddresses[accountGroup.id];
      const activeAccountName = accountGroups.find(
        (group) => group.id === accountGroup.id,
      )?.metadata.name;

      const labelOptions = [
        {
          label: `${activeAccountName} `,
          isBold: true,
        },
        { label: `${strings('toast.now_active')}` },
      ];
      toastRef?.current?.showToast({
        variant: ToastVariants.Account,
        labelOptions,
        accountAddress: address,
        accountAvatarType,
        hasNoTimeout: false,
      });
      navigation.navigate(Routes.BROWSER.HOME);
    },
    [
      isConnectionFlow,
      navigation,
      iconSeedAddresses,
      accountAvatarType,
      toastRef,
      accountGroups,
    ],
  );

  const renderItem = useCallback(
    ({ item }: { item: AccountGroupObject }) => (
      <AccountListCell
        isSelected={selectedAccountGroup?.id === item.id}
        accountGroup={item}
        onSelectAccount={handleSelectAccount}
        // @ts-expect-error - This is temporary because the account list cell is being updated in another PR.
        privacyMode={privacyMode}
      />
    ),
    [privacyMode, handleSelectAccount, selectedAccountGroup],
  );

  return (
    <View style={styles.container}>
      <View style={styles.accountsConnectedContainer}>
        <FlashList
          key={`flashlist-${selectedAccountGroups.length}`}
          data={selectedAccountGroups}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          keyExtractor={(item, index) => `${item.id || index}`}
          removeClippedSubviews={false}
          renderScrollComponent={
            ScrollView as React.ComponentType<ScrollViewProps>
          }
          ListFooterComponent={
            <TouchableOpacity
              style={styles.editAccountsContainer}
              onPress={handleEditAccountsButtonPress}
              testID={ConnectedAccountsSelectorsIDs.ACCOUNT_LIST_BOTTOM_SHEET}
            >
              <Avatar
                style={styles.editAccountIcon}
                variant={AvatarVariant.Icon}
                name={IconName.Edit}
              />
              <TextComponent
                color={TextColor.Primary}
                variant={TextVariant.BodyMDMedium}
              >
                {strings('accounts.edit_accounts_title')}
              </TextComponent>
            </TouchableOpacity>
          }
        />
      </View>
    </View>
  );
};

export default MultichainAccountsConnectedList;
