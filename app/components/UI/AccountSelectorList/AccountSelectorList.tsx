// Third party dependencies.
import React, { useCallback, useEffect, useRef } from 'react';
import { ListRenderItem, View } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { useSelector } from 'react-redux';
import { KeyringTypes } from '@metamask/controllers';

// External dependencies.
import CellAccount from '../../../component-library/components/Cells/CellAccount';
import { useStyles } from '../../../component-library/hooks';
import Text from '../../../component-library/components/Text';
import AvatarGroup from '../../../component-library/components/Avatars/AvatarGroup';
import UntypedEngine from '../../../core/Engine';
import { formatAddress } from '../../../util/address';
import { AvatarAccountType } from '../../../component-library/components/Avatars/AvatarAccount';

// Internal dependencies.
import {
  Account,
  AccountSelectorListProps,
  Assets,
} from './AccountSelectorList.types';
import styleSheet from './AccountSelectorList.styles';

const AccountSelectorList = ({
  accounts,
  onSelectAccount,
}: AccountSelectorListProps) => {
  const Engine = UntypedEngine as any;
  const accountListRef = useRef<any>(null);
  const { styles } = useStyles(styleSheet, {});
  const selectedAddress = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.selectedAddress,
  );
  const accountAvatarType = useSelector((state: any) =>
    state.settings.useBlockieIcon
      ? AvatarAccountType.Blockies
      : AvatarAccountType.JazzIcon,
  );

  useEffect(() => {
    if (!accounts.length) return;
    const account = accounts.find(({ address }) => address === selectedAddress);
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
  }, [selectedAddress, accounts.length]);

  const onPress = useCallback(
    (address: string) => {
      const { PreferencesController } = Engine.context;
      address !== selectedAddress &&
        PreferencesController.setSelectedAddress(address);
      onSelectAccount?.(address);
    },
    /* eslint-disable-next-line */
    [selectedAddress, onSelectAccount],
  );

  const getKeyExtractor = ({ address }: Account) => address;

  const getTagLabel = (type: KeyringTypes) => {
    let label = '';
    switch (type) {
      case KeyringTypes.qr:
        label = 'Hardware';
        break;
      case KeyringTypes.simple:
        label = 'Imported';
        break;
    }
    return label;
  };

  const renderAccountBalances = useCallback(
    ({ fiatBalance, tokens }: Assets) => (
      <View style={styles.balancesContainer}>
        <Text>{fiatBalance}</Text>
        <AvatarGroup tokenList={tokens} />
      </View>
    ),
    [styles.balancesContainer],
  );

  const renderAccountItem: ListRenderItem<Account> = useCallback(
    ({ item: { name, address, assets, type } }) => {
      const isSelected = selectedAddress === address;
      const shortAddress = formatAddress(address, 'short');
      const tagLabel = getTagLabel(type);

      return (
        <CellAccount
          isSelected={isSelected}
          secondaryText={shortAddress}
          onPress={() => onPress(address)}
          accountAddress={address}
          title={name}
          accountAvatarType={accountAvatarType}
          tagLabel={tagLabel}
        >
          {assets && renderAccountBalances(assets)}
        </CellAccount>
      );
    },
    [selectedAddress, accountAvatarType, onPress, renderAccountBalances],
  );

  return (
    <FlatList
      ref={accountListRef}
      data={accounts}
      keyExtractor={getKeyExtractor}
      renderItem={renderAccountItem}
      // Increasing number of items at initial render fixes scroll issue.
      initialNumToRender={999}
    />
  );
};

export default AccountSelectorList;
