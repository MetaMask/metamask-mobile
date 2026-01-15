import React, { memo, useCallback } from 'react';
import NetworkModals from '../../../../../UI/NetworkModal';
import { View, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import WarningIcon from 'react-native-vector-icons/FontAwesome';
import { toHex } from '@metamask/controller-utils';
import CustomText from '../../../../../Base/Text';
import EmptyPopularList from '../emptyList';
import { strings } from '../../../../../../../locales/i18n';
import { useTheme } from '../../../../../../util/theme';
import {
  getFilteredPopularNetworks,
  PopularList,
} from '../../../../../../util/networks/customNetworks';
import createStyles, { createCustomNetworkStyles } from '../styles';
import { CustomNetworkProps, Network } from './CustomNetwork.types';
import {
  selectChainId,
  selectNetworkConfigurations,
} from '../../../../../../selectors/networkController';
import AvatarNetwork from '../../../../../../component-library/components/Avatars/Avatar/variants/AvatarNetwork';
import { AvatarSize } from '../../../../../../component-library/components/Avatars/Avatar';
import { isNetworkUiRedesignEnabled } from '../../../../../../util/networks/isNetworkUiRedesignEnabled';
import { useSafeChains } from '../../../../../../components/hooks/useSafeChains';
import { isNonEvmChainId } from '../../../../../../core/Multichain/utils';
import { NetworkConfiguration } from '@metamask/network-controller';
import { MultichainNetworkConfiguration } from '@metamask/multichain-network-controller';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import Icon, {
  IconSize,
  IconName,
} from '../../../../../../component-library/components/Icons/Icon';
import { selectAdditionalNetworksBlacklistFeatureFlag } from '../../../../../../selectors/featureFlagController/networkBlacklist';
import { getGasFeesSponsoredNetworkEnabled } from '../../../../../../selectors/featureFlagController/gasFeesSponsored';

const CustomNetwork = ({
  showPopularNetworkModal,
  isNetworkModalVisible,
  closeNetworkModal,
  selectedNetwork,
  toggleWarningModal,
  showNetworkModal,
  switchTab,
  showAddedNetworks,
  customNetworksList,
  displayContinue,
  showCompletionMessage = true,
  hideWarningIcons = false,
  allowNetworkSwitch = true,
  showActionLabels = false,
  listHeader = '',
  skipConfirmation = false,
  onNetworkAdd,
}: CustomNetworkProps) => {
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const selectedChainId = useSelector(selectChainId);
  const isGasFeesSponsoredNetworkEnabled = useSelector(
    getGasFeesSponsoredNetworkEnabled,
  );
  const { safeChains } = useSafeChains();
  const blacklistedChainIds = useSelector(
    selectAdditionalNetworksBlacklistFeatureFlag,
  );

  // Apply blacklist filter to the network list
  const baseNetworkList = customNetworksList ?? PopularList;
  const filteredNetworkList = getFilteredPopularNetworks(
    blacklistedChainIds,
    baseNetworkList,
  );

  const supportedNetworkList = filteredNetworkList.map(
    (networkConfiguration: Network) => {
      const isAdded = Object.values(networkConfigurations).some(
        (
          savedNetwork: NetworkConfiguration | MultichainNetworkConfiguration,
        ) => {
          if (
            isNonEvmChainId(networkConfiguration.chainId) ||
            isNonEvmChainId(savedNetwork.chainId) ||
            ('isEvm' in savedNetwork && savedNetwork.isEvm === false)
          ) {
            return false;
          }

          return (
            toHex(savedNetwork.chainId) === toHex(networkConfiguration.chainId)
          );
        },
      );
      return {
        ...networkConfiguration,
        isAdded,
      };
    },
  );

  const { colors } = useTheme();
  const networkSettingsStyles = createStyles();
  const customNetworkStyles = createCustomNetworkStyles({ colors });
  const filteredPopularList = showAddedNetworks
    ? supportedNetworkList
    : supportedNetworkList.filter((n) => !n.isAdded);

  const handleNetworkPress = useCallback(
    async (networkConfiguration: Network & { isAdded: boolean }) => {
      // When skipConfirmation is true and we have onNetworkAdd callback,
      // add the network directly without showing the confirmation modal
      if (skipConfirmation && onNetworkAdd) {
        try {
          await onNetworkAdd(networkConfiguration);
        } catch (error) {
          console.error('Failed to add network:', error);
        }
      } else {
        // Fallback to showing the modal for confirmation
        showNetworkModal(networkConfiguration);
      }
    },
    [skipConfirmation, onNetworkAdd, showNetworkModal],
  );

  if (filteredPopularList.length === 0 && showCompletionMessage) {
    return (
      <EmptyPopularList goToCustomNetwork={() => switchTab?.goToPage?.(1)} />
    );
  }

  return (
    <>
      {!!listHeader && filteredPopularList.length > 0 && (
        <Text
          style={customNetworkStyles.listHeader}
          variant={TextVariant.BodyMDMedium}
        >
          {listHeader}
        </Text>
      )}
      {isNetworkModalVisible && selectedNetwork && (
        <NetworkModals
          showPopularNetworkModal={showPopularNetworkModal}
          isVisible={isNetworkModalVisible}
          onClose={closeNetworkModal}
          networkConfiguration={selectedNetwork}
          safeChains={safeChains}
          allowNetworkSwitch={allowNetworkSwitch}
        />
      )}
      {filteredPopularList.map((networkConfiguration, index) => (
        <TouchableOpacity
          key={index}
          style={networkSettingsStyles.popularNetwork}
          onPress={() => handleNetworkPress(networkConfiguration)}
        >
          <View style={networkSettingsStyles.popularWrapper}>
            <View style={networkSettingsStyles.popularNetworkImage}>
              <AvatarNetwork
                name={networkConfiguration.nickname}
                size={AvatarSize.Md}
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
            <View style={customNetworkStyles.nameAndTagContainer}>
              <CustomText bold={!isNetworkUiRedesignEnabled()}>
                {networkConfiguration.nickname}
              </CustomText>
              {isGasFeesSponsoredNetworkEnabled(
                networkConfiguration.chainId,
              ) ? (
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                  style={customNetworkStyles.tagLabelBelowName}
                >
                  {strings('networks.no_network_fee')}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={networkSettingsStyles.popularWrapper}>
            {!hideWarningIcons &&
            toggleWarningModal &&
            networkConfiguration.warning ? (
              <WarningIcon
                name="warning"
                size={14}
                color={colors.icon.alternative}
                style={networkSettingsStyles.icon}
                onPress={toggleWarningModal}
              />
            ) : null}

            {displayContinue &&
            networkConfiguration.chainId === selectedChainId ? (
              <CustomText link>{strings('networks.continue')}</CustomText>
            ) : (
              showActionLabels && (
                <Text variant={TextVariant.BodyMD}>
                  {networkConfiguration.isAdded
                    ? strings('networks.switch')
                    : strings('networks.add')}
                </Text>
              )
            )}
          </View>
          {!showActionLabels && (
            <View>
              <Icon
                style={customNetworkStyles.icon}
                name={IconName.Add}
                size={IconSize.Lg}
              />
            </View>
          )}
        </TouchableOpacity>
      ))}
    </>
  );
};

export default memo(CustomNetwork);
