import React, { memo } from 'react';
import NetworkModals from '../../../../../UI/NetworkModal';
import { View, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import ImageIcons from '../../../../../UI/ImageIcon';
import WarningIcon from 'react-native-vector-icons/FontAwesome';
import CustomText from '../../../../../Base/Text';
import EmptyPopularList from '../emptyList';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../../locales/i18n';
import { useTheme } from '../../../../../../util/theme';
import PopularList from '../../../../../../util/networks/customNetworks';
import createStyles from '../styles';
import { CustomNetworkProps, Network } from './CustomNetwork.types';
import { selectFrequentRpcList } from '../../../../../../selectors/preferencesController';

const CustomNetwork = ({
  isNetworkModalVisible,
  closeNetworkModal,
  selectedNetwork,
  toggleWarningModal,
  showNetworkModal,
  switchTab,
  shouldNetworkSwitchPopToWallet,
}: CustomNetworkProps) => {
  const savedNetworkList = useSelector(selectFrequentRpcList);

  const supportedNetworkList = PopularList.map((network: Network) => {
    const isAdded = savedNetworkList.some(
      (savedNetwork: any) => savedNetwork.chainId === network.chainId,
    );
    return {
      ...network,
      isAdded,
    };
  });

  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const filteredPopularList = supportedNetworkList.filter((n) => !n.isAdded);

  if (filteredPopularList.length === 0) {
    return <EmptyPopularList goToCustomNetwork={() => switchTab.goToPage(1)} />;
  }

  return (
    <>
      {isNetworkModalVisible && (
        <NetworkModals
          isVisible={isNetworkModalVisible}
          onClose={closeNetworkModal}
          network={selectedNetwork}
          navigation={navigation}
          shouldNetworkSwitchPopToWallet={shouldNetworkSwitchPopToWallet}
        />
      )}
      {filteredPopularList.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={styles.popularNetwork}
          onPress={() => showNetworkModal(item)}
        >
          <View style={styles.popularWrapper}>
            <ImageIcons
              image={item.rpcPrefs.imageUrl}
              style={styles.popularNetworkImage}
            />
            <CustomText bold>{item.nickname}</CustomText>
          </View>
          <View style={styles.popularWrapper}>
            {item.warning ? (
              <WarningIcon
                name="warning"
                size={14}
                color={colors.icon.alternative}
                style={styles.icon}
                onPress={toggleWarningModal}
              />
            ) : null}
            <CustomText link>{strings('networks.add')}</CustomText>
          </View>
        </TouchableOpacity>
      ))}
    </>
  );
};

export default memo(CustomNetwork);
