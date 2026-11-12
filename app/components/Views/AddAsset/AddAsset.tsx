import React, { useMemo, useRef, useState } from 'react';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { strings } from '../../../../locales/i18n';
import { selectNetworkConfigurations } from '../../../selectors/networkController';
import { useNavigation } from '@react-navigation/native';
import { IconName } from '@metamask/design-system-react-native';
import Routes from '../../../constants/navigation/Routes';
import { ImportTokenViewSelectorsIDs } from './ImportAssetView.testIds';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { useParams } from '../../../util/navigation/navUtils';
import { BottomSheetRef } from '../../../component-library/components/BottomSheets/BottomSheet';
import { Hex } from '@metamask/utils';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import { useNetworkEnablement } from '../../hooks/useNetworkEnablement/useNetworkEnablement';
import NetworkListBottomSheet from './components/NetworkListBottomSheet/NetworkListBottomSheet';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import TokenView from './Views/TokenView/TokenView';
import NFTView from './Views/NFTView/NFTView';
import HeaderStandardGlass from '../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../selectors/featureFlagController/glassHeaders';

export interface AddAssetParams {
  assetType: 'token' | 'collectible';
  collectibleContract?: {
    address: string;
  };
}

const AddAsset = () => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const navigation = useNavigation<AppNavigationProp>();
  const { assetType, collectibleContract } = useParams<AddAssetParams>();

  const tw = useTailwind();
  const insets = useSafeAreaInsets();

  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const [openNetworkSelector, setOpenNetworkSelector] = useState(false);
  const { enabledNetworksForAllNamespaces } = useNetworkEnablement();
  const enabledChainId = useMemo(
    () =>
      Object.keys(enabledNetworksForAllNamespaces).find(
        (chainId) => enabledNetworksForAllNamespaces[chainId as Hex] === true,
      ) ?? '0x1', // Fallback to Ethereum Mainnet if no networks are enabled
    [enabledNetworksForAllNamespaces],
  );
  const [selectedNetwork, setSelectedNetwork] = useState<
    SupportedCaipChainId | Hex | null
  >(assetType === 'token' ? null : (enabledChainId as Hex));

  const sheetRef = useRef<BottomSheetRef>(null);

  return (
    <SafeAreaView
      edges={['left', 'right', 'bottom']}
      style={tw.style('flex-1 bg-default', { paddingTop: insets.top })}
      testID={`add-${assetType}-screen`}
    >
      {/* Header */}
      <HeaderStandardGlass
        isGlass={isGlassHeader}
        isFloating={false}
        title={strings(
          `add_asset.${assetType === 'token' ? 'title' : 'title_nft'}`,
        )}
        onBack={() => navigation.goBack()}
        endButtonIconProps={
          assetType === 'token'
            ? [
                {
                  iconName: IconName.Add,
                  onPress: () =>
                    navigation.navigate(Routes.WALLET.ADD_CUSTOM_TOKEN),
                  accessibilityLabel: strings('add_asset.custom_token'),
                  testID: ImportTokenViewSelectorsIDs.CUSTOM_TOKEN_BUTTON,
                },
              ]
            : undefined
        }
      />

      {assetType === 'token' && (
        <TokenView
          openNetworkSelector={() => setOpenNetworkSelector(true)}
          selectedNetwork={selectedNetwork}
        />
      )}

      {assetType === 'collectible' && (
        <NFTView
          collectibleContract={collectibleContract}
          selectedNetwork={selectedNetwork}
          openNetworkSelector={() => setOpenNetworkSelector(true)}
          networkConfigurations={networkConfigurations}
        />
      )}

      {openNetworkSelector ? (
        <NetworkListBottomSheet
          selectedNetwork={selectedNetwork}
          setSelectedNetwork={setSelectedNetwork}
          setOpenNetworkSelector={setOpenNetworkSelector}
          sheetRef={sheetRef}
          displayEvmNetworksOnly={assetType === 'collectible'}
          hideTestnets={assetType === 'token'}
          onSelectAll={
            assetType === 'token' ? () => setSelectedNetwork(null) : undefined
          }
          allNetworksLabel={strings('trending.all_networks')}
        />
      ) : null}
    </SafeAreaView>
  );
};

export default AddAsset;
