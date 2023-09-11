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
import { selectNetworkConfigurations } from '../../../../../../selectors/networkController';

const CustomNetwork = ({
  isNetworkModalVisible,
  closeNetworkModal,
  selectedNetwork,
  toggleWarningModal,
  showNetworkModal,
  switchTab,
  shouldNetworkSwitchPopToWallet,
}: CustomNetworkProps) => {
  const networkConfigurations = useSelector(selectNetworkConfigurations);

  const supportedNetworkList = PopularList.map(
    (networkConfiguration: Network) => {
      const isAdded = Object.values(networkConfigurations).some(
        (savedNetwork: any) =>
          savedNetwork.chainId === networkConfiguration.chainId,
      );
      return {
        ...networkConfiguration,
        isAdded,
      };
    },
  );

  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = createStyles();
  const filteredPopularList = supportedNetworkList.filter((n) => !n.isAdded);

  if (filteredPopularList.length === 0) {
    return (
      <EmptyPopularList goToCustomNetwork={() => switchTab?.goToPage?.(1)} />
    );
  }

  return (
    <>
      {isNetworkModalVisible && (
        <NetworkModals
          isVisible={isNetworkModalVisible}
          onClose={closeNetworkModal}
          networkConfiguration={selectedNetwork}
          navigation={navigation}
          shouldNetworkSwitchPopToWallet={shouldNetworkSwitchPopToWallet}
        />
      )}
      {filteredPopularList.map((networkConfiguration, index) => (
        <TouchableOpacity
          key={index}
          style={styles.popularNetwork}
          onPress={() => showNetworkModal(networkConfiguration)}
        >
          <View style={styles.popularWrapper}>
            <ImageIcons
              image={networkConfiguration.rpcPrefs.imageUrl}
              style={styles.popularNetworkImage}
            />
            <CustomText bold>{networkConfiguration.nickname}</CustomText>
          </View>
          <View style={styles.popularWrapper}>
            {networkConfiguration.warning ? (
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
