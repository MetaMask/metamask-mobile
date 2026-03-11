import React, { useMemo } from 'react';
import { ActivityIndicator } from 'react-native';
import AddCustomToken from '../../components/AddCustomToken/AddCustomToken';
import TabBar from '../../../../../component-library/components-temp/TabBar/TabBar';
import ScrollableTabView, {
  TabBarProps,
} from '@tommasini/react-native-scrollable-tab-view';
import { strings } from '../../../../../../locales/i18n';
import { useNavigation } from '@react-navigation/native';

import { Hex } from '@metamask/utils';
import {
  MultichainNetworkConfiguration,
  SupportedCaipChainId,
} from '@metamask/multichain-network-controller';
import { isNonEvmChainId } from '../../../../../core/Multichain/utils';
import { useTheme } from '../../../../../util/theme';
import { Box } from '@metamask/design-system-react-native';
import SearchTokenAutocomplete from '../../components/SearchTokenAutoComplete/SearchTokenAutocomplete';
import NetworkSelector from '../../components/NetworkSelector/NetworkSelector';
import { useSearchRequest } from '../../../../UI/Trending/hooks/useSearchRequest/useSearchRequest';
import { formatChainIdToCaip } from '@metamask/bridge-controller';

interface TokenViewProps {
  selectedNetwork: SupportedCaipChainId | Hex | null;
  openNetworkSelector: () => void;
  networkConfigurations: Record<string, MultichainNetworkConfiguration>;
}

const TokenView = ({
  selectedNetwork,
  openNetworkSelector,
  networkConfigurations,
}: TokenViewProps) => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const renderTabBar = (props: typeof TabBarProps) => <TabBar {...props} />;

  // Probe the search API with a test query to check if the selected network supports token search.
  // If the API returns an error (e.g. 400 Bad Request), the network is unsupported.
  const { error: searchProbeError, isLoading: isLoadingSearchSupported } =
    useSearchRequest({
      chainIds: selectedNetwork ? [formatChainIdToCaip(selectedNetwork)] : [],
      query: 'USD',
      limit: 1,
      includeMarketData: false,
    });

  const chainSupportsSearch = useMemo(() => {
    if (!selectedNetwork) return false;
    // Non-EVM chains (Solana, etc.) are always supported via search
    if (isNonEvmChainId(selectedNetwork)) return true;
    // If the probe request returned an error, the chain is unsupported
    return !searchProbeError;
  }, [selectedNetwork, searchProbeError]);

  return (
    <Box twClassName="flex-1">
      <NetworkSelector
        selectedNetwork={selectedNetwork}
        openNetworkSelector={openNetworkSelector}
        networkConfigurations={networkConfigurations}
      />

      {isLoadingSearchSupported ? (
        <Box
          twClassName="flex-1 justify-center items-center px-4"
          testID="add-asset-loading-indicator"
        >
          <ActivityIndicator size="large" color={colors.primary.default} />
        </Box>
      ) : (
        <Box twClassName="flex-1" testID="add-asset-tabs-container">
          <ScrollableTabView key={selectedNetwork} renderTabBar={renderTabBar}>
            {/* Show search tab when the chain is supported by the token search API */}
            {chainSupportsSearch && (
              <SearchTokenAutocomplete
                navigation={navigation}
                tabLabel={strings('add_asset.search_token')}
                selectedChainId={selectedNetwork}
              />
            )}

            {/* Custom tokens are not supported on non-evm chains */}
            {selectedNetwork && !isNonEvmChainId(selectedNetwork) && (
              <AddCustomToken
                chainId={selectedNetwork}
                tabLabel={strings('add_asset.custom_token')}
                isTokenDetectionSupported={chainSupportsSearch}
              />
            )}
          </ScrollableTabView>
        </Box>
      )}
    </Box>
  );
};

export default TokenView;
