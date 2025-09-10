import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { SafeAreaView, View } from 'react-native';
import { useSelector } from 'react-redux';
import TabBar from '../../../component-library/components-temp/TabBar/TabBar';
import AddCustomToken from '../../UI/AddCustomToken';
import SearchTokenAutocomplete from '../../UI/SearchTokenAutocomplete';
import ScrollableTabView, {
  TabBarProps,
} from 'react-native-scrollable-tab-view';
import { strings } from '../../../../locales/i18n';
import AddCustomCollectible from '../../UI/AddCustomCollectible';
import {
  getImportTokenNavbarOptions,
  getNetworkNavbarOptions,
} from '../../UI/Navbar';
import { isTokenDetectionSupportedForNetwork } from '@metamask/assets-controllers';
import {
  selectAllPopularNetworkConfigurations,
  selectEvmChainId,
  selectEvmNetworkConfigurationsByChainId,
  selectProviderConfig,
} from '../../../selectors/networkController';
import { selectEvmNetworkName } from '../../../selectors/networkInfos';
import {
  selectDisplayNftMedia,
  selectTokenNetworkFilter,
} from '../../../selectors/preferencesController';
import Banner from '../../../component-library/components/Banners/Banner/Banner';
import {
  BannerAlertSeverity,
  BannerVariant,
} from '../../../component-library/components/Banners/Banner';
import Text from '../../../component-library/components/Texts/Text/Text';
import { TextVariant } from '../../../component-library/components/Texts/Text';
import { ButtonVariants } from '../../../component-library/components/Buttons/Button';
import { useNavigation } from '@react-navigation/native';
import { useStyles } from '../../../component-library/hooks';
import styleSheet from './AddAsset.styles';
import Routes from '../../../constants/navigation/Routes';
import { NFT_TITLE, TOKEN, TOKEN_TITLE } from './AddAsset.constants';
import { AddAssetViewSelectorsIDs } from '../../../../e2e/selectors/wallet/AddAssetView.selectors';
import { BottomSheetRef } from '../../../component-library/components/BottomSheets/BottomSheet';
import { Hex } from '@metamask/utils';
import { enableAllNetworksFilter } from '../../UI/Tokens/util/enableAllNetworksFilter';
import Engine from '../../../core/Engine';
import NetworkListBottomSheet from './components/NetworkListBottomSheet';
import NetworkFilterBottomSheet from './components/NetworkFilterBottomSheet';
import {
  useNetworksByNamespace,
  NetworkType,
} from '../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { useNetworkSelection } from '../../hooks/useNetworkSelection/useNetworkSelection';
import { isRemoveGlobalNetworkSelectorEnabled } from '../../../util/networks';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootParamList } from '../../../util/navigation/types';

export enum FilterOption {
  AllNetworks,
  CurrentNetwork,
}

export interface FilterHandlerParams {
  option: FilterOption;
  allNetworksEnabled: Record<string, boolean>;
  chainId: string;
}

type AddAssetProps = StackScreenProps<RootParamList, 'AddAsset'>;

export const handleFilterControlsPress = ({
  option,
  allNetworksEnabled,
  chainId,
}: FilterHandlerParams) => {
  const { PreferencesController } = Engine.context;
  switch (option) {
    case FilterOption.AllNetworks:
      PreferencesController.setTokenNetworkFilter(allNetworksEnabled);
      break;
    case FilterOption.CurrentNetwork:
      PreferencesController.setTokenNetworkFilter({
        [chainId]: true,
      });
      break;
    default:
      break;
  }
};

const AddAsset = ({ route }: AddAssetProps) => {
  const navigation = useNavigation();
  const { assetType, collectibleContract } = route.params;

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
  const allNetworks = useSelector(selectAllPopularNetworkConfigurations);
  const allNetworksEnabled = useMemo(
    () => enableAllNetworksFilter(allNetworks),
    [allNetworks],
  );
  const isAllNetworksEnabled = useSelector(selectTokenNetworkFilter);
  const { networks } = useNetworksByNamespace({
    networkType: NetworkType.Popular,
  });
  const { selectNetwork } = useNetworkSelection({
    networks,
  });

  const [openNetworkFilter, setOpenNetworkFilter] = useState(false);
  const [openNetworkSelector, setOpenNetworkSelector] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<Hex | null>(null);
  const sheetRef = useRef<BottomSheetRef>(null);

  const isTokenDetectionSupported =
    isTokenDetectionSupportedForNetwork(chainId);

  const networkName = useSelector(selectEvmNetworkName);

  const updateNavBar = useCallback(() => {
    navigation.setOptions(
      assetType === TOKEN
        ? getImportTokenNavbarOptions(
            `add_asset.${TOKEN_TITLE}`,
            true,
            navigation,
            colors,
            true,
            0,
          )
        : getNetworkNavbarOptions(
            `add_asset.${assetType === TOKEN ? TOKEN_TITLE : NFT_TITLE}`,
            true,
            navigation,
            colors,
          ),
    );
  }, [assetType, colors, navigation]);

  useEffect(() => {
    updateNavBar();
  }, [updateNavBar]);

  const goToSecuritySettings = () => {
    navigation.navigate(Routes.SHEET.SHOW_NFT_DISPLAY_MEDIA);
  };

  const onFilterControlsBottomSheetPress = (option: FilterOption) => {
    if (isRemoveGlobalNetworkSelectorEnabled()) {
      selectNetwork(chainId);
    }
    handleFilterControlsPress({
      option,
      allNetworksEnabled,
      chainId,
    });
    setOpenNetworkFilter(false);
  };

  const renderTabBar = (props: TabBarProps) => <TabBar {...props} />;

  const renderNetworkSelector = useCallback(
    () => (
      <NetworkListBottomSheet
        selectedNetwork={selectedNetwork}
        setSelectedNetwork={setSelectedNetwork}
        setOpenNetworkSelector={setOpenNetworkSelector}
        sheetRef={sheetRef}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [openNetworkSelector, networkConfigurations, selectedNetwork],
  );

  const renderNetworkFilterSelector = useCallback(
    () => (
      <NetworkFilterBottomSheet
        onFilterControlsBottomSheetPress={onFilterControlsBottomSheetPress}
        setOpenNetworkFilter={setOpenNetworkFilter}
        sheetRef={sheetRef}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allNetworksEnabled, onFilterControlsBottomSheetPress],
  );

  return (
    <SafeAreaView style={styles.wrapper} testID={`add-${assetType}-screen`}>
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
        <View style={styles.tabContainer}>
          <ScrollableTabView key={chainId} renderTabBar={renderTabBar}>
            {isTokenDetectionSupported && (
              <SearchTokenAutocomplete
                navigation={navigation}
                tabLabel={strings('add_asset.search_token')}
                onPress={() => setOpenNetworkFilter(!openNetworkFilter)}
                isAllNetworksEnabled={
                  isAllNetworksEnabled &&
                  Object.keys(isAllNetworksEnabled).length > 1
                }
                allNetworksEnabled={allNetworksEnabled}
              />
            )}
            <AddCustomToken
              chainId={selectedNetwork}
              networkName={networkName}
              ticker={providerConfig.ticker}
              type={providerConfig.type}
              navigation={navigation}
              tabLabel={strings('add_asset.custom_token')}
              isTokenDetectionSupported={isTokenDetectionSupported}
              setOpenNetworkSelector={setOpenNetworkSelector}
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
      ) : (
        <AddCustomCollectible
          navigation={navigation}
          collectibleContract={collectibleContract}
        />
      )}
      {openNetworkFilter ? renderNetworkFilterSelector() : null}
      {openNetworkSelector ? renderNetworkSelector() : null}
    </SafeAreaView>
  );
};

export default AddAsset;
