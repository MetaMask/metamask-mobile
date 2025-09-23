import React from 'react';
import BaseControlBar from '../shared/BaseControlBar';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import NftGridList from './NftGridList';
import { StyleSheet, View } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

const NftGrid = () => (
  <View style={styles.container}>
    <BaseControlBar
      networkFilterTestId={WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER}
      useEvmSelectionLogic={false}
      customWrapper="none"
      hideSort
    />
    <NftGridList />
  </View>
);

export default NftGrid;
