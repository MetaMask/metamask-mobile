// Third party dependencies.
import React from 'react';
import { ListRenderItem, View } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { useSelector } from 'react-redux';

// External dependencies.
import CellAccount from '../../../component-library/components/Cells/CellAccount';
import { useStyles } from '../../../component-library/hooks';
import Text from '../../../component-library/components/Text';
import AvatarGroup from '../../../component-library/components/Avatars/AvatarGroup';
import UntypedEngine from '../../../core/Engine';
import { formatAddress } from '../../../util/address';

// Internal dependencies.
import {
  Account,
  AccountSelectionListProps,
  Assets,
} from './AccountSelectionList.types';
import styleSheet from './AccountSelectionList.styles';

const AccountSelectionList = ({ accounts }: AccountSelectionListProps) => {
  const Engine = UntypedEngine as any;
  const { styles } = useStyles(styleSheet, {});
  const selectedAddress = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.selectedAddress,
  );

  const onPress = (address: string) => {
    const { PreferencesController } = Engine.context;
    address !== selectedAddress &&
      PreferencesController.setSelectedAddress(address);
  };

  const renderAccountBalances = ({ fiatBalance, tokens }: Assets) => (
    <View style={styles.balancesContainer}>
      <Text>{fiatBalance}</Text>
      <AvatarGroup tokenList={tokens} />
    </View>
  );

  const renderAccountItem: ListRenderItem<Account> = ({
    item: { name, address, assets },
  }) => {
    const isSelected = selectedAddress === address;
    const shortAddress = formatAddress(address, 'short');

    return (
      <CellAccount
        isSelected={isSelected}
        secondaryText={shortAddress}
        onPress={() => onPress(address)}
        accountAddress={address}
        title={name}
      >
        {assets && renderAccountBalances(assets)}
      </CellAccount>
    );
  };

  return <FlatList data={accounts} renderItem={renderAccountItem} />;
};

export default AccountSelectionList;
