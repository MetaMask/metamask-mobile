import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { RefreshControl, TouchableOpacity, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { NetworksChainId, NetworkType } from '@metamask/controller-utils';
import { useSelector } from 'react-redux';

import LoadingNetworksSkeleton from './LoadingNetworksSkeleton';
import ScreenLayout from '../../components/ScreenLayout';
import ErrorView from '../../components/ErrorView';
import Row from '../../components/Row';

import Avatar, {
  AvatarSize,
  AvatarVariants,
} from '../../../../../../component-library/components/Avatars/Avatar';
import imageIcons from '../../../../../../images/image-icons';
import Text from '../../../../../Base/Text';
import CustomNetwork from '../../../../../Views/Settings/NetworksSettings/NetworkSettings/CustomNetworkView/CustomNetwork';
import customNetworkStyles from '../../../../../Views/Settings/NetworksSettings/NetworkSettings/styles';
import { Network } from '../../../../../Views/Settings/NetworksSettings/NetworkSettings/CustomNetworkView/CustomNetwork.types';

import useFetchRampNetworks from '../../hooks/useFetchRampNetworks';
import useRampNetwork from '../../hooks/useRampNetwork';
import useRampNetworksDetail from '../../hooks/useRampNetworksDetail';
import useAnalytics from '../../hooks/useAnalytics';
import { getRampNetworks } from '../../../../../../reducers/fiatOrders';
import { useRampSDK } from '../../sdk';
import { isNetworkRampSupported } from '../../utils';

import Engine from '../../../../../../core/Engine';
import { useTheme } from '../../../../../../util/theme';
import { getFiatOnRampAggNavbar } from '../../../../Navbar';
import { selectNetworkConfigurations } from '../../../../../../selectors/networkController';
import { strings } from '../../../../../../../locales/i18n';
import Routes from '../../../../../../constants/navigation/Routes';

import PopularList from '../../../../../../util/networks/customNetworks';

function NetworkSwitcher() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const customNetworkStyle = customNetworkStyles();
  const trackEvent = useAnalytics();

  const [isLoadingNetworks, errorFetchingNetworks, fetchNetworks] =
    useFetchRampNetworks();
  const {
    networksDetails,
    isLoading: isLoadingNetworksDetail,
    error: errorFetchingNetworksDetail,
    getNetworksDetail,
  } = useRampNetworksDetail();
  const supportedNetworks = useSelector(getRampNetworks);
  const [isCurrentNetworkRampSupported] = useRampNetwork();
  const { selectedChainId } = useRampSDK();

  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const [networkToBeAdded, setNetworkToBeAdded] = useState<Network>();

  const isLoading = isLoadingNetworks || isLoadingNetworksDetail;
  const error = errorFetchingNetworks || errorFetchingNetworksDetail;
  const rampNetworks = useMemo(() => {
    const activeNetworkDetails: Network[] = [];
    supportedNetworks.forEach(({ chainId: supportedChainId, active }) => {
      const currentChainId = `${supportedChainId}`;
      if (
        currentChainId === NetworksChainId['linea-mainnet'] ||
        currentChainId === NetworksChainId.mainnet ||
        !active
      ) {
        return;
      }

      const popularNetwork = PopularList.find(
        ({ chainId }) => chainId === currentChainId,
      );

      if (popularNetwork) {
        activeNetworkDetails.push(popularNetwork);
        return;
      }

      const networkDetail = networksDetails.find(
        ({ chainId }) => chainId === currentChainId,
      );
      if (networkDetail) {
        activeNetworkDetails.push(networkDetail);
      }
    });

    return activeNetworkDetails;
  }, [networksDetails, supportedNetworks]);

  const handleCancelPress = useCallback(() => {
    trackEvent('ONRAMP_CANCELED', {
      location: 'Network Switcher Screen',
      chain_id_destination: selectedChainId,
    });
  }, [selectedChainId, trackEvent]);

  useEffect(() => {
    navigation.setOptions(
      getFiatOnRampAggNavbar(
        navigation,
        {
          title: strings('fiat_on_ramp_aggregator.network_switcher.title', {
            rampType: strings('fiat_on_ramp_aggregator.buy'),
          }),
          showBack: false,
        },
        colors,
        handleCancelPress,
      ),
    );
  }, [navigation, colors, handleCancelPress]);

  useEffect(() => {
    if (isCurrentNetworkRampSupported) {
      navigation.navigate(Routes.RAMP.BUY.GET_STARTED);
      return;
    }
  }, [isCurrentNetworkRampSupported, navigation]);

  const switchToMainnet = useCallback((type: 'mainnet' | 'linea-mainnet') => {
    const { NetworkController } = Engine.context;
    NetworkController.setProviderType(type as NetworkType);
  }, []);

  const switchNetwork = useCallback(
    (networkConfiguration) => {
      const { CurrencyRateController, NetworkController } = Engine.context;
      const entry = Object.entries(networkConfigurations).find(
        ([_a, { chainId }]) => chainId === networkConfiguration.chainId,
      );

      if (entry) {
        const [networkConfigurationId] = entry;
        const { ticker } = networkConfiguration;

        CurrencyRateController.setNativeCurrency(ticker);
        NetworkController.setActiveNetwork(networkConfigurationId);
      }
    },
    [networkConfigurations],
  );

  const handleNetworkPress = useCallback(
    (networkConfiguration) => {
      if (networkConfiguration.isAdded) {
        switchNetwork(networkConfiguration);
      } else {
        setNetworkToBeAdded(networkConfiguration);
      }
    },
    [switchNetwork],
  );

  const handleNetworkModalClose = useCallback(() => {
    if (networkToBeAdded) {
      setNetworkToBeAdded(undefined);
    }
  }, [networkToBeAdded]);

  if (error) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ErrorView
            description={error.message}
            ctaOnPress={() => {
              getNetworksDetail();
              fetchNetworks();
            }}
            location={'Network Switcher Screen'}
          />
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <ScrollView
        refreshControl={
          <RefreshControl
            colors={[colors.primary.default]}
            tintColor={colors.icon.default}
            refreshing={isLoading}
            onRefresh={() => {
              getNetworksDetail();
              fetchNetworks();
            }}
          />
        }
      >
        <ScreenLayout.Body>
          <ScreenLayout.Content>
            <Text centered big>
              {strings('fiat_on_ramp_aggregator.network_switcher.description', {
                rampType: strings('fiat_on_ramp_aggregator.buy'),
              })}
            </Text>

            <Row />

            {isLoading ? (
              <LoadingNetworksSkeleton />
            ) : (
              <>
                {isNetworkRampSupported(
                  NetworksChainId.mainnet,
                  supportedNetworks,
                ) ? (
                  <TouchableOpacity
                    style={customNetworkStyle.popularNetwork}
                    onPress={() => switchToMainnet('mainnet')}
                  >
                    <View style={customNetworkStyle.popularWrapper}>
                      <View style={customNetworkStyle.popularNetworkImage}>
                        <Avatar
                          variant={AvatarVariants.Network}
                          size={AvatarSize.Sm}
                          name={'Ethereum Mainnet'}
                          imageSource={imageIcons.ETHEREUM}
                        />
                      </View>

                      <Text bold>Ethereum Main Network</Text>
                    </View>
                    <View style={customNetworkStyle.popularWrapper}>
                      <Text link>{strings('networks.switch')}</Text>
                    </View>
                  </TouchableOpacity>
                ) : null}
                {isNetworkRampSupported(
                  NetworksChainId['linea-mainnet'],
                  supportedNetworks,
                ) ? (
                  <TouchableOpacity
                    style={customNetworkStyle.popularNetwork}
                    onPress={() => switchToMainnet('linea-mainnet')}
                  >
                    <View style={customNetworkStyle.popularWrapper}>
                      <View style={customNetworkStyle.popularNetworkImage}>
                        <Avatar
                          variant={AvatarVariants.Network}
                          size={AvatarSize.Sm}
                          name={'Linea Mainnet'}
                          imageSource={imageIcons['LINEA-MAINNET']}
                        />
                      </View>
                      <Text bold>Linea Main Network</Text>
                    </View>
                    <View style={customNetworkStyle.popularWrapper}>
                      <Text link>{strings('networks.switch')}</Text>
                    </View>
                  </TouchableOpacity>
                ) : null}

                <CustomNetwork
                  showAddedNetworks
                  selectedNetwork={networkToBeAdded}
                  isNetworkModalVisible={Boolean(networkToBeAdded)}
                  closeNetworkModal={handleNetworkModalClose}
                  showNetworkModal={handleNetworkPress}
                  onNetworkSwitch={() => undefined}
                  shouldNetworkSwitchPopToWallet={false}
                  customNetworksList={rampNetworks}
                />
              </>
            )}
          </ScreenLayout.Content>
        </ScreenLayout.Body>
      </ScrollView>
    </ScreenLayout>
  );
}

export default NetworkSwitcher;
