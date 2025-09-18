import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SolScope } from '@metamask/keyring-api';
import {
  ImageSourcePropType,
  RefreshControl,
  TouchableOpacity,
  View,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { ChainId, toHex } from '@metamask/controller-utils';
import { useSelector } from 'react-redux';

import LoadingNetworksSkeleton from './LoadingNetworksSkeleton';
import ScreenLayout from '../../components/ScreenLayout';
import ErrorView from '../../components/ErrorView';
import Row from '../../components/Row';

import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../../component-library/components/Avatars/Avatar';
import imageIcons from 'images/image-icons';
import Text from '../../../../../Base/Text';
import CustomNetwork from '../../../../../Views/Settings/NetworksSettings/NetworkSettings/CustomNetworkView/CustomNetwork';
import customNetworkStyles from '../../../../../Views/Settings/NetworksSettings/NetworkSettings/styles';
import {
  Network,
  ExtendedNetwork,
} from '../../../../../Views/Settings/NetworksSettings/NetworkSettings/CustomNetworkView/CustomNetwork.types';

import useFetchRampNetworks from '../../hooks/useFetchRampNetworks';
import useRampNetwork from '../../hooks/useRampNetwork';
import useRampNetworksDetail from '../../hooks/useRampNetworksDetail';
import useAnalytics from '../../../hooks/useAnalytics';
import { getRampNetworks } from '../../../../../../reducers/fiatOrders';
import { useRampSDK } from '../../sdk';
import { isNetworkRampSupported } from '../../utils';

import Engine from '../../../../../../core/Engine';
import { useTheme } from '../../../../../../util/theme';
import { getFiatOnRampAggNavbar } from '../../../../Navbar';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../../../selectors/networkController';
import { strings } from '../../../../../../../locales/i18n';
import Routes from '../../../../../../constants/navigation/Routes';

import { PopularList } from '../../../../../../util/networks/customNetworks';
import { getDecimalChainId } from '../../../../../../util/networks';

interface NetworkWithAdded extends Network, ExtendedNetwork {
  isAdded?: boolean;
}

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
  const { isBuy, intent, setIntent } = useRampSDK();

  const networkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const [networkToBeAdded, setNetworkToBeAdded] = useState<NetworkWithAdded>();

  const isLoading = isLoadingNetworks || isLoadingNetworksDetail;
  const error = errorFetchingNetworks || errorFetchingNetworksDetail;
  const rampNetworksDetails = useMemo(() => {
    const activeNetworkDetails: Network[] = [];
    // TODO(ramp, btc): filter supportedNetworks by EVM compatible chains (chainId are strings of decimal numbers)
    supportedNetworks.forEach(({ chainId: supportedChainId, active }) => {
      let rampSupportedNetworkChainIdAsHex: `0x${string}`;
      try {
        rampSupportedNetworkChainIdAsHex = toHex(supportedChainId);
      } catch {
        return;
      }
      if (
        rampSupportedNetworkChainIdAsHex === ChainId['linea-mainnet'] ||
        rampSupportedNetworkChainIdAsHex === ChainId.mainnet ||
        !active
      ) {
        return;
      }

      const popularNetworkDetail = PopularList.find(
        ({ chainId }) => chainId === rampSupportedNetworkChainIdAsHex,
      );

      if (popularNetworkDetail) {
        activeNetworkDetails.push(popularNetworkDetail);
        return;
      }

      const networkDetail = networksDetails.find(
        ({ chainId }) => toHex(chainId) === rampSupportedNetworkChainIdAsHex,
      );
      if (networkDetail) {
        activeNetworkDetails.push(networkDetail);
      }
    });

    return activeNetworkDetails;
  }, [networksDetails, supportedNetworks]);

  const handleCancelPress = useCallback(() => {
    if (isBuy) {
      trackEvent('ONRAMP_CANCELED', {
        location: 'Network Switcher Screen',
        chain_id_destination: 'unknown', // TODO: Replace with actual chainId
      });
    } else {
      trackEvent('OFFRAMP_CANCELED', {
        location: 'Network Switcher Screen',
        chain_id_source: 'unknown', // TODO: Replace with actual chainId
      });
    }
  }, [isBuy, trackEvent]);

  useEffect(() => {
    navigation.setOptions(
      getFiatOnRampAggNavbar(
        navigation,
        {
          title: strings('fiat_on_ramp_aggregator.network_switcher.title', {
            rampType: strings(
              isBuy
                ? 'fiat_on_ramp_aggregator.buy'
                : 'fiat_on_ramp_aggregator.sell',
            ),
          }),
          showBack: false,
        },
        colors,
        handleCancelPress,
      ),
    );
  }, [isBuy, navigation, colors, handleCancelPress]);

  const navigateToGetStarted = useCallback(() => {
    navigation.navigate(Routes.RAMP.GET_STARTED, { chainId: undefined });
  }, [navigation]);

  const switchToMainnet = useCallback(
    (type: 'mainnet' | 'linea-mainnet' | SolScope.Mainnet) => {
      const { MultichainNetworkController } = Engine.context;
      MultichainNetworkController.setActiveNetwork(type);
      navigateToGetStarted();
    },
    [navigateToGetStarted],
  );

  const switchNetwork = useCallback(
    async (networkConfiguration: Network) => {
      const { MultichainNetworkController } = Engine.context;
      const config = Object.values(networkConfigurations).find(
        ({ chainId }) => chainId === networkConfiguration.chainId,
      );

      if (config) {
        const { rpcEndpoints, defaultRpcEndpointIndex } = config;

        const { networkClientId } =
          rpcEndpoints?.[defaultRpcEndpointIndex] ?? {};

        await MultichainNetworkController.setActiveNetwork(networkClientId);

        navigateToGetStarted();
      }
    },
    [navigateToGetStarted, networkConfigurations],
  );

  const handleNetworkPress = useCallback(
    async (networkConfiguration: NetworkWithAdded) => {
      setIntent((prevIntent) => ({
        ...prevIntent,
        chainId: networkConfiguration.chainId,
      }));

      const networkConfigurationWithHexChainId = {
        ...networkConfiguration,
        chainId: toHex(networkConfiguration.chainId),
      };

      if (networkConfiguration.isAdded) {
        await switchNetwork(networkConfigurationWithHexChainId);
      } else {
        setNetworkToBeAdded(networkConfigurationWithHexChainId);
      }
    },
    [setIntent, switchNetwork],
  );

  const handleIntentChainId = useCallback(
    async (chainId: string) => {
      if (!isNetworkRampSupported(chainId, supportedNetworks)) {
        return;
      }
      if (getDecimalChainId(ChainId.mainnet) === chainId) {
        return switchToMainnet('mainnet');
      }

      if (getDecimalChainId(ChainId['linea-mainnet']) === chainId) {
        return switchToMainnet('linea-mainnet');
      }

      if (chainId === SolScope.Mainnet) {
        return switchToMainnet(SolScope.Mainnet);
      }

      const supportedNetworkConfigurations = rampNetworksDetails.map(
        (networkConfiguration) => {
          const isAdded = Object.values(networkConfigurations).some(
            (savedNetwork) =>
              toHex(savedNetwork.chainId) ===
              toHex(networkConfiguration.chainId),
          );
          return {
            ...networkConfiguration,
            isAdded,
          };
        },
      );

      const networkConfiguration = supportedNetworkConfigurations.find(
        ({ chainId: configurationChainId }) =>
          toHex(configurationChainId) === toHex(chainId),
      );

      if (networkConfiguration) {
        await handleNetworkPress(networkConfiguration);
      }
    },
    [
      supportedNetworks,
      switchToMainnet,
      rampNetworksDetails,
      networkConfigurations,
      handleNetworkPress,
    ],
  );

  useEffect(() => {
    if (isCurrentNetworkRampSupported && !intent?.chainId) {
      navigateToGetStarted();
    } else if (intent?.chainId) {
      handleIntentChainId(intent.chainId);
    }
  }, [
    handleIntentChainId,
    intent?.chainId,
    isCurrentNetworkRampSupported,
    navigateToGetStarted,
    navigation,
  ]);

  const handleNetworkModalClose = useCallback(() => {
    if (networkToBeAdded) {
      setNetworkToBeAdded(undefined);
    }
  }, [networkToBeAdded]);

  if (!isLoading && (error || rampNetworksDetails.length === 0)) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ErrorView
            description={
              error?.message ??
              strings(
                'fiat_on_ramp_aggregator.network_switcher.no_networks_found',
              )
            }
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
                rampType: strings(
                  isBuy
                    ? 'fiat_on_ramp_aggregator.buy'
                    : 'fiat_on_ramp_aggregator.sell',
                ),
              })}
            </Text>

            <Row />

            {isLoading ? (
              <LoadingNetworksSkeleton />
            ) : (
              <>
                {isNetworkRampSupported(ChainId.mainnet, supportedNetworks) ? (
                  <TouchableOpacity
                    style={customNetworkStyle.popularNetwork}
                    onPress={() => switchToMainnet('mainnet')}
                  >
                    <View style={customNetworkStyle.popularWrapper}>
                      <View style={customNetworkStyle.popularNetworkImage}>
                        <Avatar
                          variant={AvatarVariant.Network}
                          size={AvatarSize.Sm}
                          name={'Ethereum Mainnet'}
                          imageSource={
                            imageIcons.ETHEREUM as ImageSourcePropType
                          }
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
                  ChainId['linea-mainnet'],
                  supportedNetworks,
                ) ? (
                  <TouchableOpacity
                    style={customNetworkStyle.popularNetwork}
                    onPress={() => switchToMainnet('linea-mainnet')}
                  >
                    <View style={customNetworkStyle.popularWrapper}>
                      <View style={customNetworkStyle.popularNetworkImage}>
                        <Avatar
                          variant={AvatarVariant.Network}
                          size={AvatarSize.Sm}
                          name={'Linea Mainnet'}
                          imageSource={
                            imageIcons['LINEA-MAINNET'] as ImageSourcePropType
                          }
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
                  customNetworksList={rampNetworksDetails}
                  showCompletionMessage={false}
                  showPopularNetworkModal
                  displayContinue
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
