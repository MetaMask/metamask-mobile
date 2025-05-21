// Third party dependencies.
import React, { useCallback } from 'react';
import { View, FlatList, TouchableOpacity } from 'react-native';
import { useSelector, shallowEqual } from 'react-redux';
import { CaipAccountId, parseCaipAccountId } from '@metamask/utils';

// external dependencies
import Engine from '../../../../core/Engine';
import { RootState } from '../../../../reducers';
import { strings } from '../../../../../locales/i18n';
import { isDefaultAccountName } from '../../../../util/ENSUtils';
import { formatAddress } from '../../../../util/address';
import { useStyles } from '../../../../component-library/hooks';
import AvatarGroup from '../../../../component-library/components/Avatars/AvatarGroup';
import {
  EnsByAccountAddress,
  Account,
  Assets,
} from '../../../hooks/useAccounts';
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
import styleSheet from './AccountsConnectedItemList.styles';

const AccountsConnectedItemList = ({
  selectedAddresses,
  ensByAccountAddress,
  accounts,
  privacyMode,
  networkAvatars,
  handleEditAccountsButtonPress,
}: {
  selectedAddresses: CaipAccountId[];
  ensByAccountAddress: EnsByAccountAddress;
  accounts: Account[];
  privacyMode: boolean;
  networkAvatars: NetworkAvatarProps[];
  handleEditAccountsButtonPress: () => void;
}) => {
  const HEIGHT_BY_ACCOUNTS_LENGTH =
    selectedAddresses.length * ACCOUNTS_CONNECTED_LIST_ITEM_HEIGHT;
  const MAX_HEIGHT =
    selectedAddresses.length < MAX_VISIBLE_ITEMS
      ? HEIGHT_BY_ACCOUNTS_LENGTH
      : MAX_VISIBLE_ITEMS;

  const { styles } = useStyles(styleSheet, { itemHeight: MAX_HEIGHT });
  const accountAvatarType = useSelector(
    (state: RootState) =>
      state.settings.useBlockieIcon
        ? AvatarAccountType.Blockies
        : AvatarAccountType.JazzIcon,
    shallowEqual,
  );

  const renderRightAccessory = useCallback(
    ({ fiatBalance }: Assets, address: string) => {
      const fiatBalanceStrSplit = fiatBalance.split('\n');
      const fiatBalanceAmount = fiatBalanceStrSplit[0] || '';

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
            avatarPropsList={networkAvatars.map((avatar) => ({
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
      networkAvatars,
    ],
  );

  const renderAccountItem = useCallback(
    ({ item }: { item: CaipAccountId }) => {
      const { address } = parseCaipAccountId(item);
      const shortAddress = formatAddress(address, 'short');
      const accountMetadata =
        Engine.context.AccountsController.getAccountByAddress(address);
      const account = accounts.find(
        (accountData: Account) =>
          accountData.address.toLowerCase() === address.toLowerCase(),
      );
      const avatarProps = {
        variant: AvatarVariant.Account as const,
        type: accountAvatarType,
        accountAddress: address,
      };
      const accountMetadataName = accountMetadata?.metadata.name;
      const ensName = ensByAccountAddress[address];
      const accountName =
        isDefaultAccountName(accountMetadataName) && ensName
          ? ensName
          : accountMetadataName;

      return (
        <Cell
          key={address}
          style={styles.accountListItem}
          variant={CellVariant.Display}
          avatarProps={avatarProps}
          title={accountName}
          secondaryText={shortAddress}
          showSecondaryTextIcon={false}
        >
          {account?.assets && renderRightAccessory(account?.assets, address)}
        </Cell>
      );
    },
    [
      styles.accountListItem,
      ensByAccountAddress,
      accounts,
      renderRightAccessory,
      accountAvatarType,
    ],
  );

  return (
    <View style={styles.container}>
      <View style={styles.accountsConnectedContainer}>
        <FlatList
          keyExtractor={(item) => item}
          data={selectedAddresses}
          renderItem={renderAccountItem}
          scrollEnabled={selectedAddresses.length > 1}
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

export default AccountsConnectedItemList;
