// Third party dependencies.
import React, { useCallback } from 'react';
import { View, TouchableOpacity } from 'react-native';

// external dependencies
import { strings } from '../../../../../locales/i18n';
import { useStyles } from '../../../../component-library/hooks';
import TextComponent, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { ConnectedAccountsSelectorsIDs } from '../../../../../e2e/selectors/Browser/ConnectedAccountModal.selectors';

// internal dependencies
import styleSheet from './MultichainAccountsConnectedList.styles';
import { AccountGroupObject } from '@metamask/account-tree-controller';
import { FlashList } from '@shopify/flash-list';
import AccountListCell from '../../../../component-library/components-temp/MultichainAccounts/MultichainAccountSelectorList/AccountListCell';
import Avatar, {
  AvatarVariant,
} from '../../../../component-library/components/Avatars/Avatar';
import { IconName } from '../../../../component-library/components/Icons/Icon';

const MultichainAccountsConnectedList = ({
  privacyMode,
  selectedAccountGroups,
  handleEditAccountsButtonPress,
}: {
  privacyMode: boolean;
  selectedAccountGroups: AccountGroupObject[];
  handleEditAccountsButtonPress: () => void;
}) => {
  const { styles } = useStyles(styleSheet, {
    itemHeight: 64,
    numOfAccounts: selectedAccountGroups.length,
  });

  const renderItem = useCallback(
    ({ item }: { item: AccountGroupObject }) => (
      <AccountListCell
        accountGroup={item}
        onSelectAccount={() => {
          // No op here because it is handled by edit accounts.
        }}
        // @ts-expect-error - This is temporary because the account list cell is being updated in another PR.
        privacyMode={privacyMode}
      />
    ),
    [privacyMode],
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
