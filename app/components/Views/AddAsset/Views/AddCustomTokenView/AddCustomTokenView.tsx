import React, { useRef, useState } from 'react';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Box, SelectButton } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Hex } from '@metamask/utils';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { strings } from '../../../../../../locales/i18n';
import { TRENDING_NETWORKS_LIST } from '../../../../UI/Trending/utils/trendingNetworksList';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
import { BottomSheetRef } from '../../../../../component-library/components/BottomSheets/BottomSheet';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';
import NetworkListBottomSheet from '../../components/NetworkListBottomSheet/NetworkListBottomSheet';
import AddCustomToken from '../../components/AddCustomToken/AddCustomToken';
import { ImportTokenViewSelectorsIDs } from '../../ImportAssetView.testIds';

/** Import a token by contract address on a single EVM network. */
const AddCustomTokenView = () => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const insets = useSafeAreaInsets();
  const networkConfigurations = useSelector(selectNetworkConfigurations);

  const [selectedNetwork, setSelectedNetwork] = useState<
    SupportedCaipChainId | Hex
  >('0x1');
  const [isNetworkSheetOpen, setIsNetworkSheetOpen] = useState(false);
  const sheetRef = useRef<BottomSheetRef>(null);

  const isTokenDetectionSupported = TRENDING_NETWORKS_LIST.some(
    (network) => network.caipChainId === formatChainIdToCaip(selectedNetwork),
  );

  return (
    <SafeAreaView
      edges={['left', 'right', 'bottom']}
      style={tw.style('flex-1 bg-default', { paddingTop: insets.top })}
      testID={ImportTokenViewSelectorsIDs.CUSTOM_TOKEN_CONTAINER}
    >
      <HeaderStandardGlass
        isGlass={isGlassHeader}
        isFloating={false}
        title={strings('add_asset.custom_token')}
        onBack={() => navigation.goBack()}
      />

      <Box twClassName="flex-row px-4 pb-4 pt-2">
        <SelectButton
          testID={ImportTokenViewSelectorsIDs.SELECT_NETWORK_BUTTON}
          placeholder={strings('networks.select_network')}
          value={networkConfigurations?.[selectedNetwork as Hex]?.name}
          onPress={() => setIsNetworkSheetOpen(true)}
        />
      </Box>

      <Box twClassName="flex-1">
        <AddCustomToken
          key={selectedNetwork}
          chainId={selectedNetwork}
          isTokenDetectionSupported={isTokenDetectionSupported}
        />
      </Box>

      {isNetworkSheetOpen ? (
        <NetworkListBottomSheet
          selectedNetwork={selectedNetwork}
          setSelectedNetwork={setSelectedNetwork}
          setOpenNetworkSelector={setIsNetworkSheetOpen}
          sheetRef={sheetRef}
          displayEvmNetworksOnly
        />
      ) : null}
    </SafeAreaView>
  );
};

export default AddCustomTokenView;
