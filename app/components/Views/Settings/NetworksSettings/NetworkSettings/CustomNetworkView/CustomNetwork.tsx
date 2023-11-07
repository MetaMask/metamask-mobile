import React, { memo } from 'react';
import NetworkModals from '../../../../../UI/NetworkModal';
import { View, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
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
import AvatarNetwork from '../../../../../../component-library/components/Avatars/Avatar/variants/AvatarNetwork';
import { AvatarSize } from '../../../../../../component-library/components/Avatars/Avatar';

const CustomNetwork = ({
  isNetworkModalVisible,
  closeNetworkModal,
  selectedNetwork,
  toggleWarningModal,
  showNetworkModal,
  switchTab,
  shouldNetworkSwitchPopToWallet,
  onNetworkSwitch,
  showAddedNetworks,
  customNetworksList,
}: CustomNetworkProps) => {
  const networkConfigurations = useSelector(selectNetworkConfigurations);

  const supportedNetworkList = (customNetworksList ?? PopularList).map(
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
  const filteredPopularList = showAddedNetworks
    ? supportedNetworkList
    : supportedNetworkList.filter((n) => !n.isAdded);

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
          onNetworkSwitch={onNetworkSwitch}
        />
      )}
      {filteredPopularList.map((networkConfiguration, index) => (
        <TouchableOpacity
          key={index}
          style={styles.popularNetwork}
          onPress={() => showNetworkModal(networkConfiguration)}
        >
          <View style={styles.popularWrapper}>
            <View style={styles.popularNetworkImage}>
              <AvatarNetwork
                name={networkConfiguration.nickname}
                size={AvatarSize.Sm}
                imageSource={
                  networkConfiguration.rpcPrefs.imageSource ||
                  (networkConfiguration.rpcPrefs.imageUrl
                    ? {
                        uri: networkConfiguration.rpcPrefs.imageUrl,
                      }
                    : undefined)
                }
              />
            </View>
            <CustomText bold>{networkConfiguration.nickname}</CustomText>
          </View>
          <View style={styles.popularWrapper}>
            {toggleWarningModal && networkConfiguration.warning ? (
              <WarningIcon
                name="warning"
                size={14}
                color={colors.icon.alternative}
                style={styles.icon}
                onPress={toggleWarningModal}
              />
            ) : null}
            <CustomText link>
              {networkConfiguration.isAdded
                ? strings('networks.switch')
                : strings('networks.add')}
            </CustomText>
          </View>
        </TouchableOpacity>
      ))}
    </>
  );
};

export default memo(CustomNetwork);
