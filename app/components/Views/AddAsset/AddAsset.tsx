import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
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
import BottomSheetHeader from '../../../component-library/components/BottomSheets/BottomSheetHeader';
import { isTokenDetectionSupportedForNetwork } from '@metamask/assets-controllers';
import {
  selectEvmChainId,
  selectEvmNetworkConfigurationsByChainId,
  selectProviderConfig,
} from '../../../selectors/networkController';
import { selectEvmNetworkName } from '../../../selectors/networkInfos';
import { selectDisplayNftMedia } from '../../../selectors/preferencesController';
import { selectERC20TokensByChain } from '../../../selectors/tokenListController';
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
import { NFT_TITLE, TOKEN, TOKEN_TITLE } from './AddAsset.constants';
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
  const chainId = useSelector(selectEvmChainId);
  const displayNftMedia = useSelector(selectDisplayNftMedia);
  const networkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const tokenListForAllChains = useSelector(selectERC20TokensByChain);
  const [openNetworkSelector, setOpenNetworkSelector] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<Hex | null>(chainId);
  const sheetRef = useRef<BottomSheetRef>(null);

  // Update selectedNetwork when chainId changes (MultichainNetworkController active network)
  useEffect(() => {
    if (!selectedNetwork) {
      setSelectedNetwork(chainId);
    }
  }, [chainId, selectedNetwork]);

  const isTokenDetectionSupported = isTokenDetectionSupportedForNetwork(
    selectedNetwork || chainId,
  );

  const networkName = useSelector(selectEvmNetworkName);

  // Check if there are tokens available for the selected network
  const hasTokensForSelectedNetwork = useMemo(() => {
    if (!selectedNetwork) return false;
    const tokensData = tokenListForAllChains?.[selectedNetwork]?.data;
    if (!tokensData) return null;
    return tokensData && Object.keys(tokensData).length > 0;
  }, [selectedNetwork, tokenListForAllChains]);

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

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
          Engine.context.TokenListController.fetchTokenList(network);
        }}
        setOpenNetworkSelector={setOpenNetworkSelector}
        sheetRef={sheetRef}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [openNetworkSelector, networkConfigurations, selectedNetwork],
  );

  return (
    <SafeAreaView style={styles.wrapper} testID={`add-${assetType}-screen`}>
      <BottomSheetHeader onBack={handleBackPress}>
        {strings(`add_asset.${assetType === TOKEN ? TOKEN_TITLE : NFT_TITLE}`)}
      </BottomSheetHeader>
      {assetType !== 'token' && (
        <View style={styles.infoWrapper}>
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
          <View style={styles.networkSelectorWrapper}>
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
              <View style={styles.overlappingAvatarsContainer}>
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
          {hasTokensForSelectedNetwork === null ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary.default} />
            </View>
          ) : (
            <View style={styles.tabContainer}>
              <ScrollableTabView key={chainId} renderTabBar={renderTabBar}>
                {isTokenDetectionSupported && hasTokensForSelectedNetwork && (
                  <SearchTokenAutocomplete
                    navigation={navigation}
                    tabLabel={strings('add_asset.search_token')}
                    selectedChainId={selectedNetwork}
                  />
                )}
                <AddCustomToken
                  chainId={selectedNetwork}
                  networkName={networkName}
                  ticker={providerConfig.ticker}
                  type={providerConfig.type}
                  navigation={navigation}
                  tabLabel={strings('add_asset.custom_token')}
                  isTokenDetectionSupported={
                    isTokenDetectionSupported && hasTokensForSelectedNetwork
                  }
                  selectedNetwork={
                    selectedNetwork
                      ? networkConfigurations?.[selectedNetwork as Hex]?.name
                      : null
                  }
                  networkClientId={
                    selectedNetwork
                      ? networkConfigurations?.[selectedNetwork]?.rpcEndpoints[
                          networkConfigurations?.[selectedNetwork]
                            ?.defaultRpcEndpointIndex
                        ]?.networkClientId
                      : null
                  }
                />
              </ScrollableTabView>
            </View>
          )}
        </>
      ) : (
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
              ? networkConfigurations?.[selectedNetwork]?.rpcEndpoints[
                  networkConfigurations?.[selectedNetwork]
                    ?.defaultRpcEndpointIndex
                ]?.networkClientId
              : null
          }
        />
      )}
      {openNetworkSelector ? renderNetworkSelector() : null}
    </SafeAreaView>
  );
};

export default AddAsset;
