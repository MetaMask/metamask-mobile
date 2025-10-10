import { StyleSheet, View } from 'react-native';
import React from 'react';
import { useSelector } from 'react-redux';
import { selectProviderType } from '../../../selectors/networkController';
import { selectUseNftDetection } from '../../../selectors/preferencesController';
import { MAINNET } from '../../../constants/network';
import CollectibleDetectionModal from '../CollectibleDetectionModal';

const styles = StyleSheet.create({
  emptyView: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const NftGridHeader = () => {
  const networkType = useSelector(selectProviderType);
  const useNftDetection = useSelector(selectUseNftDetection);

  const isCollectionDetectionBannerVisible =
    networkType === MAINNET && !useNftDetection;

  return (
    isCollectionDetectionBannerVisible && (
      <View style={styles.emptyView}>
        <CollectibleDetectionModal />
      </View>
    )
  );
};

export default NftGridHeader;
