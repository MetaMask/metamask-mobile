import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator, SafeAreaView, View } from 'react-native';
import { useSelector } from 'react-redux';
import TabBar from '../../../component-library/components-temp/TabBar/TabBar';
import AddCustomToken from '../../UI/AddCustomToken';
import SearchTokenAutocomplete from '../../UI/SearchTokenAutocomplete';
import ScrollableTabView, {
  TabBarProps,
} from '@tommasini/react-native-scrollable-tab-view';
import { strings } from '../../../../locales/i18n';
import AddCustomCollectible from '../../UI/AddCustomCollectible';
import {
  selectChainId,
  selectNetworkConfigurations,
  selectProviderConfig,
} from '../../../selectors/networkController';
import { selectEvmNetworkName } from '../../../selectors/networkInfos';
import { selectDisplayNftMedia } from '../../../selectors/preferencesController';
import Banner from '../../../component-library/components/Banners/Banner/Banner';
import {
  BannerAlertSeverity,
  BannerVariant,
} from '../../../component-library/components/Banners/Banner';
import Text from '../../../component-library/components/Texts/Text/Text';
import { TextVariant } from '../../../component-library/components/Texts/Text';
import { ButtonVariants } from '../../../component-library/components/Buttons/Button';
import { useNavigation } from '@react-navigation/native';
import { useParams } from '../../../util/navigation/navUtils';
import { useStyles } from '../../../component-library/hooks';
import styleSheet from './AddAsset.styles';
import { AddAssetParams } from './AddAsset.types';
import Routes from '../../../constants/navigation/Routes';
import { AddAssetViewSelectorsIDs } from '../../../../e2e/selectors/wallet/AddAssetView.selectors';
import { BottomSheetRef } from '../../../component-library/components/BottomSheets/BottomSheet';
import { Hex } from '@metamask/utils';
import NetworkListBottomSheet from './components/NetworkListBottomSheet';
import Engine from '../../../core/Engine';
import { TouchableOpacity } from 'react-native-gesture-handler';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../component-library/components/Avatars/Avatar';
import ButtonIcon from '../../../component-library/components/Buttons/ButtonIcon';
import {
  IconColor,
  IconName,
} from '../../../component-library/components/Icons/Icon';
import { getNetworkImageSource } from '../../../util/networks';
import { ImportTokenViewSelectorsIDs } from '../../../../e2e/selectors/wallet/ImportTokenView.selectors';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import { isNonEvmChainId } from '../../../core/Multichain/utils';
import { useTopTokens } from '../../UI/Bridge/hooks/useTopTokens';

export enum FilterOption {
  AllNetworks,
  CurrentNetwork,
}

const AddAsset = () => {
  const navigation = useNavigation();
  const { assetType, collectibleContract } = useParams<AddAssetParams>();

  const {
    styles,
    theme: { colors },
  } = useStyles(styleSheet, {});

  const providerConfig = useSelector(selectProviderConfig);
  const chainId = useSelector(selectChainId);
  const displayNftMedia = useSelector(selectDisplayNftMedia);
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const [openNetworkSelector, setOpenNetworkSelector] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<
    SupportedCaipChainId | Hex | null
  >(chainId);
  const sheetRef = useRef<BottomSheetRef>(null);

  const { topTokens, remainingTokens, pending } = useTopTokens({
    chainId: selectedNetwork ?? undefined,
  });

  // Update selectedNetwork when chainId changes (MultichainNetworkController active network)
  useEffect(() => {
    if (!selectedNetwork) {
      setSelectedNetwork(chainId);
    }
  }, [chainId, selectedNetwork]);

  const networkName = useSelector(selectEvmNetworkName);

  const goToSecuritySettings = () => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SHOW_NFT_DISPLAY_MEDIA,
    });
  };

  const renderTabBar = (props: typeof TabBarProps) => <TabBar {...props} />;

  const renderNetworkSelector = useCallback(
    () => (
      <NetworkListBottomSheet
        selectedNetwork={selectedNetwork}
        setSelectedNetwork={async (network) => {
          setSelectedNetwork(network);
          if (!isNonEvmChainId(network)) {
            Engine.context.TokenListController.fetchTokenList(network as Hex);
          }
        }}
        setOpenNetworkSelector={setOpenNetworkSelector}
        sheetRef={sheetRef}
        displayEvmNetworksOnly={assetType !== 'token'}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [openNetworkSelector, networkConfigurations, selectedNetwork, assetType],
  );

  const allTokens = useMemo(
    () => [...(topTokens || []), ...(remainingTokens || [])],
    [topTokens, remainingTokens],
  );

  return (
    <SafeAreaView style={styles.wrapper} testID={`add-${assetType}-screen`}>
      {assetType !== 'token' && (
        <View accessibilityRole="none" accessible={false} style={styles.infoWrapper} testID="add-asset-nft-banner">
          <Banner
            variant={BannerVariant.Alert}
            description={
              !displayNftMedia ? (
                <>
                  <Text variant={TextVariant.BodyMD}>
                    {strings('wallet.display_nft_media_cta_new_1')}
                    <Text variant={TextVariant.BodyMDBold}>
                      {' '}
                      {strings('wallet.display_nft_media_cta_new_2')}
                    </Text>
                  </Text>
                </>
              ) : (
                <Text
                  variant={TextVariant.BodyMD}
                  testID={AddAssetViewSelectorsIDs.WARNING_ENABLE_DISPLAY_MEDIA}
                >
                  {strings('wallet.display_media_nft_warning')}
                </Text>
              )
            }
            severity={
              !displayNftMedia
                ? BannerAlertSeverity.Info
                : BannerAlertSeverity.Warning
            }
            actionButtonProps={
              !displayNftMedia
                ? {
                    variant: ButtonVariants.Link,
                    onPress: goToSecuritySettings,
                    label: strings('wallet.display_nft_media_cta'),
                  }
                : undefined
            }
          />
        </View>
      )}
      {assetType === 'token' ? (
        <>
          <View
            style={styles.networkSelectorWrapper}
            testID="add-asset-network-selector"
          >
            <TouchableOpacity
              style={styles.networkSelectorContainer}
              onPress={() => setOpenNetworkSelector(true)}
              onLongPress={() => setOpenNetworkSelector(true)}
            >
              <Text style={styles.networkSelectorText}>
                {selectedNetwork
                  ? networkConfigurations?.[selectedNetwork as Hex]?.name
                  : strings('networks.select_network')}
              </Text>
              <View accessibilityRole="none" accessible={false} style={styles.overlappingAvatarsContainer}>
                {selectedNetwork ? (
                  <Avatar
                    variant={AvatarVariant.Network}
                    size={AvatarSize.Sm}
                    name={
                      networkConfigurations?.[selectedNetwork as Hex]?.name ||
                      ''
                    }
                    imageSource={getNetworkImageSource({
                      networkType: 'evm',
                      chainId: selectedNetwork,
                    })}
                    testID={ImportTokenViewSelectorsIDs.SELECT_NETWORK_BUTTON}
                  />
                ) : null}

                <ButtonIcon
                  iconName={IconName.ArrowDown}
                  iconColor={IconColor.Default}
                  testID={ImportTokenViewSelectorsIDs.SELECT_NETWORK_BUTTON}
                  onPress={() => setOpenNetworkSelector(true)}
                  accessibilityRole="button"
                />
              </View>
            </TouchableOpacity>
          </View>
          {pending ? (
            <View
              style={styles.loadingContainer}
              testID="add-asset-loading-indicator"
            >
              <ActivityIndicator size="large" color={colors.primary.default} />
            </View>
          ) : (
            <View accessibilityRole="none" accessible={false} style={styles.tabContainer} testID="add-asset-tabs-container">
              <ScrollableTabView key={chainId} renderTabBar={renderTabBar}>
                {allTokens && allTokens.length > 0 && (
                  <SearchTokenAutocomplete
                    navigation={navigation}
                    tabLabel={strings('add_asset.search_token')}
                    allTokens={allTokens}
                    selectedChainId={selectedNetwork}
                  />
                )}

                {/* Custom tokens are not supported on non-evm chains */}
                {selectedNetwork && !isNonEvmChainId(selectedNetwork) && (
                  <AddCustomToken
                    chainId={selectedNetwork}
                    networkName={networkName}
                    ticker={providerConfig.ticker}
                    type={providerConfig.type}
                    navigation={navigation}
                    tabLabel={strings('add_asset.custom_token')}
                    isTokenDetectionSupported={
                      allTokens && allTokens.length > 0
                    }
                    selectedNetwork={
                      selectedNetwork
                        ? networkConfigurations?.[selectedNetwork as Hex]?.name
                        : null
                    }
                    networkClientId={
                      selectedNetwork
                        ? (Engine.context.NetworkController.state
                            ?.networkConfigurationsByChainId?.[
                            selectedNetwork as Hex
                          ]?.rpcEndpoints?.[
                            Engine.context.NetworkController.state
                              ?.networkConfigurationsByChainId?.[
                              selectedNetwork as Hex
                            ]?.defaultRpcEndpointIndex ?? 0
                          ]?.networkClientId ?? null)
                        : null
                    }
                  />
                )}
              </ScrollableTabView>
            </View>
          )}
        </>
      ) : (
        // Collectibles are not supported on non-evm chains
        selectedNetwork &&
        !isNonEvmChainId(selectedNetwork) && (
          <AddCustomCollectible
            navigation={navigation}
            collectibleContract={collectibleContract}
            setOpenNetworkSelector={setOpenNetworkSelector}
            networkId={networkConfigurations?.[selectedNetwork as Hex]?.chainId}
            selectedNetwork={
              selectedNetwork
                ? networkConfigurations?.[selectedNetwork as Hex]?.name
                : null
            }
            networkClientId={
              selectedNetwork
                ? (Engine.context.NetworkController.state
                    ?.networkConfigurationsByChainId?.[selectedNetwork as Hex]
                    ?.rpcEndpoints?.[
                    Engine.context.NetworkController.state
                      ?.networkConfigurationsByChainId?.[selectedNetwork as Hex]
                      ?.defaultRpcEndpointIndex ?? 0
                  ]?.networkClientId ?? null)
                : null
            }
          />
        )
      )}
      {openNetworkSelector ? renderNetworkSelector() : null}
    </SafeAreaView>
  );
};

export default AddAsset;
