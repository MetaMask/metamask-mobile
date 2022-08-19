import React from 'react';
import NetworkModals from '../../../../UI/NetworkModal';
import { View, TouchableOpacity } from 'react-native';
import ImageIcons from '../../../../UI/ImageIcon';
import WarningIcon from 'react-native-vector-icons/FontAwesome';
import CustomText from '../../../../Base/Text';
import EmptyPopularList from './emptyList';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import createStyles from './styles';

const ExtendedNetworkList = ({
  switchable,
  currentChainId,
  frequentRpcList,
  showPopularNetworkModal,
  onCancel,
  popularNetwork,
  toggleWarningModal,
  togglePopularNetwork,
  tabView,
}: any) => {
  // The frequentRpcList is a list of network the user has already added.
  // The popularNetwork list should hide this list.
  // However, the on-ramp will include this list to the defined popular list but change the CTA to "Switch"
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const filteredFrequentRpcList = frequentRpcList.filter(
    (key: { chainId: string }) => currentChainId !== key.chainId,
  );

  const filteredPopularList = popularNetwork.filter(
    (val) =>
      !frequentRpcList.some(
        (key: { chainId: string }) => val.chainId === key.chainId,
      ),
  );

  // this condition won't matter for the on ramp.
  if (filteredPopularList.length === 0) {
    return <EmptyPopularList goToCustomNetwork={() => tabView.goToPage(1)} />;
  }

  return (
    <>
      {showPopularNetworkModal && (
        <NetworkModals
          isVisible={showPopularNetworkModal}
          onClose={onCancel}
          network={popularNetwork}
          navigation={navigation}
        />
      )}
      {switchable &&
        filteredFrequentRpcList.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.popularNetwork}
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            onPress={() => {}} //implement the logic for switching networks
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
              <CustomText link>Switch</CustomText>
            </View>
          </TouchableOpacity>
        ))}

      {filteredPopularList.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={styles.popularNetwork}
          onPress={() => togglePopularNetwork(item)}
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

export default ExtendedNetworkList;
