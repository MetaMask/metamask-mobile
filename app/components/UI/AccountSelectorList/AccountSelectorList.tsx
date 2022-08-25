// Third party dependencies.
import React, { useCallback, useEffect, useRef } from 'react';
import { ListRenderItem, View } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { useSelector } from 'react-redux';
import { KeyringTypes } from '@metamask/controllers';

// External dependencies.
import Cell, {
  CellVariants,
} from '../../../component-library/components/Cells/Cell';
import { useStyles } from '../../../component-library/hooks';
import Text from '../../../component-library/components/Text';
import AvatarGroup from '../../../component-library/components/Avatars/AvatarGroup';
import UntypedEngine from '../../../core/Engine';
import { formatAddress } from '../../../util/address';
import { AvatarAccountType } from '../../../component-library/components/Avatars/AvatarAccount';
import { isDefaultAccountName } from '../../../util/ENSUtils';
import { strings } from '../../../../locales/i18n';
import { AvatarVariants } from '../../../component-library/components/Avatars/Avatar.types';

// Internal dependencies.
import {
  Account,
  AccountSelectorListProps,
  Assets,
} from './AccountSelectorList.types';
import styleSheet from './AccountSelectorList.styles';
import { useAccounts } from './hooks';

const AccountSelectorList = ({
  onSelectAccount,
  checkBalanceError,
  isLoading = false,
  ...props
}: AccountSelectorListProps) => {
  const Engine = UntypedEngine as any;
  const accountListRef = useRef<any>(null);
  const { styles } = useStyles(styleSheet, {});
  const accountAvatarType = useSelector((state: any) =>
    state.settings.useBlockieIcon
      ? AvatarAccountType.Blockies
      : AvatarAccountType.JazzIcon,
  );
  const { accounts, ensByAccountAddress } = useAccounts({
    checkBalanceError,
    isLoading,
  });

  useEffect(() => {
    if (!accounts.length) return;
    const account = accounts.find(({ isSelected }) => isSelected);
    if (account) {
      // Wrap in timeout to provide more time for the list to render.
      setTimeout(() => {
        accountListRef?.current?.scrollToOffset({
          offset: account.yOffset,
          animated: false,
        });
      }, 0);
    }
    // eslint-disable-next-line
  }, [accounts.length]);

  const onPress = useCallback(
    (address: string) => {
      const { PreferencesController } = Engine.context;
      PreferencesController.setSelectedAddress(address);
      onSelectAccount?.(address);
    },
    /* eslint-disable-next-line */
    [onSelectAccount],
  );

  const getKeyExtractor = ({ address }: Account) => address;

  const getTagLabel = (type: KeyringTypes) => {
    let label = '';
    switch (type) {
      case KeyringTypes.qr:
        label = strings('transaction.hardware');
        break;
      case KeyringTypes.simple:
        label = strings('accounts.imported');
        break;
    }
    return label;
  };

  const renderAccountBalances = useCallback(
    ({ fiatBalance, tokens }: Assets) => (
      <View style={styles.balancesContainer}>
        <Text style={styles.balanceLabel}>{fiatBalance}</Text>
        {tokens && <AvatarGroup tokenList={tokens} />}
      </View>
    ),
    [styles.balancesContainer, styles.balanceLabel],
  );

  const renderAccountItem: ListRenderItem<Account> = useCallback(
    ({ item: { name, address, assets, type, isSelected, balanceError } }) => {
      const shortAddress = formatAddress(address, 'short');
      const tagLabel = getTagLabel(type);
      const ensName = ensByAccountAddress[address];
      const accountName =
        isDefaultAccountName(name) && ensName ? ensName : name;
      const isDisabled = !!balanceError || isLoading;

      return (
        <Cell
          variant={CellVariants.Select}
          isSelected={isSelected}
          title={accountName}
          secondaryText={shortAddress}
          tertiaryText={balanceError}
          onPress={() => onPress(address)}
          avatarProps={{
            variant: AvatarVariants.Account,
            type: accountAvatarType,
            accountAddress: address,
          }}
          tagLabel={tagLabel}
          disabled={isDisabled}
          /* eslint-disable-next-line */
          style={{ opacity: isDisabled ? 0.5 : 1 }}
        >
          {assets && renderAccountBalances(assets)}
        </Cell>
      );
    },
    [
      accountAvatarType,
      onPress,
      renderAccountBalances,
      ensByAccountAddress,
      isLoading,
    ],
  );

  return (
    <FlatList
      ref={accountListRef}
      data={accounts}
      keyExtractor={getKeyExtractor}
      renderItem={renderAccountItem}
      // Increasing number of items at initial render fixes scroll issue.
      initialNumToRender={999}
      {...props}
    />
  );
};

export default AccountSelectorList;
