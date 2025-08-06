// Third party dependencies.
import React, { useCallback, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  ScrollViewProps,
} from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { useSelector, shallowEqual } from 'react-redux';
import {
  parseCaipChainId,
  CaipAccountId,
  CaipChainId,
  parseCaipAccountId,
  KnownCaipNamespace,
} from '@metamask/utils';

// external dependencies
import Engine from '../../../../core/Engine';
import { RootState } from '../../../../reducers';
import { strings } from '../../../../../locales/i18n';
import { areAddressesEqual, formatAddress } from '../../../../util/address';
import { useStyles } from '../../../../component-library/hooks';
import AvatarGroup from '../../../../component-library/components/Avatars/AvatarGroup';
import { EnsByAccountAddress, Account } from '../../../hooks/useAccounts';
import {
  AvatarAccountType,
  AvatarVariant,
} from '../../../../component-library/components/Avatars/Avatar';
import Cell, {
  CellVariant,
} from '../../../../component-library/components/Cells/Cell';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../../component-library/components/Texts/SensitiveText';
import TextComponent, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { ConnectedAccountsSelectorsIDs } from '../../../../../e2e/selectors/Browser/ConnectedAccountModal.selectors';
import {
  ACCOUNTS_CONNECTED_LIST_ITEM_HEIGHT,
  MAX_VISIBLE_ITEMS,
} from '../../../UI/PermissionsSummary/PermissionSummary.constants';

// internal dependencies
import { NetworkAvatarProps } from '../AccountConnect.types';
import styleSheet from './AccountsConnectedList.styles';
import { AccountGroupId } from '@metamask/account-api';
import { AccountGroupWithInternalAccounts } from '../../../../selectors/multichainAccounts/accounts';
import { FlashList } from '@shopify/flash-list';

const MultichainAccountsConnectedList = ({
  selectedAccountGroupIds,
  accountGroups,
  privacyMode,
  networkAvatars,
  handleEditAccountsButtonPress,
  onSelectAccount,
}: {
  selectedAccountGroupIds: AccountGroupId[];
  accountGroups: AccountGroupWithInternalAccounts[];
  privacyMode: boolean;
  networkAvatars: NetworkAvatarProps[];
  handleEditAccountsButtonPress: () => void;
  onSelectAccount: (accountGroup: AccountGroupWithInternalAccounts) => void;
}) => {
  const accountListRef =
    useRef<FlashList<AccountGroupWithInternalAccounts>>(null);
  const accountGroupsLengthRef = useRef<number>(0);

  const HEIGHT_BY_ACCOUNTS_LENGTH =
    selectedAccountGroupIds.length * ACCOUNTS_CONNECTED_LIST_ITEM_HEIGHT;
  const MAX_HEIGHT =
    selectedAccountGroupIds.length < MAX_VISIBLE_ITEMS
      ? HEIGHT_BY_ACCOUNTS_LENGTH
      : MAX_VISIBLE_ITEMS;

  const { styles } = useStyles(styleSheet, { itemHeight: MAX_HEIGHT });
  const accountAvatarType = AvatarAccountType.Maskicon;

  const getFilteredNetworkAvatars = useCallback(
    (accountScopes: CaipChainId[] = []) => {
      if (!accountScopes.length) return [];

      return networkAvatars.filter((avatar) => {
        const { namespace } = parseCaipChainId(avatar.caipChainId);

        return accountScopes.some((scope) => {
          switch (namespace) {
            case KnownCaipNamespace.Bip122:
              return scope.includes(KnownCaipNamespace.Bip122);
            case KnownCaipNamespace.Solana:
              return scope.includes(KnownCaipNamespace.Solana);
            case KnownCaipNamespace.Eip155:
              return scope.includes(KnownCaipNamespace.Eip155);
            default:
              return false;
          }
        });
      });
    },
    [networkAvatars],
  );

  const renderRightAccessory = useCallback(
    (account: Account) => {
      const { assets, address, scopes = [] } = account;
      const { fiatBalance } = assets || {};
      const fiatBalanceStrSplit = fiatBalance?.split('\n') || [];
      const fiatBalanceAmount = fiatBalanceStrSplit[0] || '';
      const filteredNetworkAvatars = getFilteredNetworkAvatars(scopes);

      return (
        <View
          style={styles.balancesContainer}
          testID={`account-connected-item-${address}`}
        >
          <SensitiveText
            length={SensitiveTextLength.Long}
            style={styles.balanceLabel}
            isHidden={privacyMode}
          >
            {fiatBalanceAmount}
          </SensitiveText>
          <AvatarGroup
            avatarPropsList={filteredNetworkAvatars.map((avatar) => ({
              ...avatar,
              variant: AvatarVariant.Network,
            }))}
          />
        </View>
      );
    },
    [
      styles.balancesContainer,
      styles.balanceLabel,
      privacyMode,
      getFilteredNetworkAvatars,
    ],
  );

  const renderAccountItem = useCallback(
    ({ item }: { item: AccountGroupId }) => {
      const accountGroup = accountGroups.find((acc) => acc.id === item);
      if (!accountGroup) return null;

      const accountName = accountGroup.metadata.name;
      const avatarProps = {
        variant: AvatarVariant.Account as const,
        type: accountAvatarType,
        accountAddress: accountGroup?.id,
      };

      return (
        <Cell
          key={accountGroup?.id}
          style={styles.accountListItem}
          variant={CellVariant.Display}
          avatarProps={avatarProps}
          title={accountName}
          showSecondaryTextIcon={false}
          onPress={() => {
            onSelectAccount(accountGroup);
          }}
        >
          {/* {account && renderRightAccessory(account)} */}
        </Cell>
      );
    },
    [styles.accountListItem, accountAvatarType],
  );

  const onContentSizeChanged = useCallback(() => {
    // Handle auto scroll to account
    if (!accountGroups.length) return;

    if (accountGroupsLengthRef.current !== accountGroups.length) {
      let selectedAccountGroup: AccountGroupWithInternalAccounts | undefined;

      if (selectedAccountGroupIds?.length) {
        const selectedAccountGroupId = selectedAccountGroupIds[0];
        selectedAccountGroup = accountGroups.find(
          (acc) => acc.id === selectedAccountGroupId,
        );
      }

      // Fall back to the account with isSelected flag if no override or match found
      if (!selectedAccountGroup) {
        selectedAccountGroup = accountGroups.find(
          (acc) => acc.id === selectedAccountGroup?.id,
        );
      }

      // accountListRef.current?.scrollToOffset({
      //   offset: selectedAccountGroup?.yOffset || 0,
      //   animated: false,
      // });

      accountGroupsLengthRef.current = accountGroups.length;
    }
  }, [accountGroups, accountListRef, selectedAccountGroupIds]);

  return (
    <View style={styles.container}>
      <View style={styles.accountsConnectedContainer}>
        <FlatList
          keyExtractor={(item) => item}
          data={selectedAccountGroupIds}
          renderItem={renderAccountItem}
          scrollEnabled={accountGroups.length > 1}
        />
      </View>
      <TouchableOpacity
        style={styles.editAccountsContainer}
        onPress={handleEditAccountsButtonPress}
        testID={ConnectedAccountsSelectorsIDs.ACCOUNT_LIST_BOTTOM_SHEET}
      >
        <TextComponent
          style={styles.editAccount}
          color={TextColor.Primary}
          variant={TextVariant.BodyMDMedium}
        >
          {strings('accounts.edit_accounts_title')}
        </TextComponent>
      </TouchableOpacity>
    </View>
  );
};

export default MultichainAccountsConnectedList;
