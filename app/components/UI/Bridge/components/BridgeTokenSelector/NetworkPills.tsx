import React, { useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Pressable } from 'react-native';
import { Text, TextVariant } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { selectBridgeFeatureFlags } from '../../../../../core/redux/slices/bridge';
import { RootState } from '../../../../../reducers';
import { Hex, CaipChainId } from '@metamask/utils';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
import { PopularList } from '../../../../../util/networks/customNetworks';
import { MultichainNetworkConfiguration } from '@metamask/multichain-network-controller';
import { ScrollView } from 'react-native-gesture-handler';
import { NETWORK_TO_SHORT_NETWORK_NAME_MAP } from '../../../../../constants/bridge';

const getNetworkName = (
  chainId: Hex | CaipChainId,
  networkConfigurations: Record<string, MultichainNetworkConfiguration>,
) => {
  // Convert CAIP chain ID to hex format for network configurations lookup
  const convertedChainId = chainId.startsWith('eip155:')
    ? `0x${parseInt(chainId.split(':')[1]).toString(16)}`
    : chainId;

  return (
    NETWORK_TO_SHORT_NETWORK_NAME_MAP[convertedChainId as CaipChainId | Hex] ??
    networkConfigurations?.[convertedChainId as Hex]?.name ??
    PopularList.find((network) => network.chainId === convertedChainId)
      ?.nickname ??
    'Unknown Network'
  );
};

interface NetworkPillsProps {
  selectedChainId?: CaipChainId;
  onChainSelect: (chainId?: CaipChainId) => void;
}

export const NetworkPills: React.FC<NetworkPillsProps> = ({
  selectedChainId,
  onChainSelect,
}) => {
  const tw = useTailwind();
  const scrollViewRef = useRef<ScrollView>(null);
  const hasScrolledRef = useRef(false);
  const bridgeFeatureFlags = useSelector((state: RootState) =>
    selectBridgeFeatureFlags(state),
  );
  const networkConfigurations = useSelector(selectNetworkConfigurations);

  // Extract chainRanking from feature flags
  const chainRanking = useMemo(() => {
    // Use chainRanking from bridge feature flags
    if (!bridgeFeatureFlags.chainRanking) {
      return [];
    }

    return bridgeFeatureFlags.chainRanking.map((chain) => ({
      ...chain,
      name: getNetworkName(chain.chainId, networkConfigurations),
    }));
  }, [bridgeFeatureFlags, networkConfigurations]);

  // Auto-scroll to selected network on initial layout
  const handleContentSizeChange = () => {
    if (hasScrolledRef.current || !selectedChainId) return;

    const selectedIndex = chainRanking.findIndex(
      (chain) => chain.chainId === selectedChainId,
    );

    // Only scroll if the selected network is beyond the first 2 visible networks
    // The first few networks are already visible, no need to scroll
    if (selectedIndex > 1) {
      const pillWidth = 90; // Average pill width including gap
      // Scroll to position the selected network more towards the center
      scrollViewRef.current?.scrollTo({
        x: selectedIndex * pillWidth - pillWidth,
        animated: false,
      });
    }
    hasScrolledRef.current = true;
  };

  const handleAllPress = () => {
    onChainSelect(undefined);
  };

  const handleChainPress = (chainId: CaipChainId) => {
    onChainSelect(chainId);
  };

  const renderChainPills = () =>
    chainRanking.map((chain) => {
      const isSelected = selectedChainId === chain.chainId;

      return (
        <Pressable
          key={chain.chainId}
          style={({ pressed }) =>
            tw.style(
              'rounded-lg border border-border-muted px-3 py-1.5',
              isSelected ? 'bg-background-muted' : 'bg-background-default',
              pressed && 'opacity-70',
            )
          }
          onPress={() => handleChainPress(chain.chainId)}
        >
          <Text variant={TextVariant.BodySm}>{chain.name}</Text>
        </Pressable>
      );
    });

  return (
    <ScrollView
      ref={scrollViewRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={tw.style('flex-grow-0')}
      contentContainerStyle={tw.style('flex-row items-center gap-2 mx-2')}
      onContentSizeChange={handleContentSizeChange}
    >
      {/* All CTA - First pill */}
      <Pressable
        style={({ pressed }) =>
          tw.style(
            'rounded-lg border border-border-muted px-3 py-1.5',
            !selectedChainId ? 'bg-background-muted' : 'bg-background-default',
            pressed && 'opacity-70',
          )
        }
        onPress={handleAllPress}
      >
        <Text variant={TextVariant.BodySm}>{strings('bridge.all')}</Text>
      </Pressable>
      {renderChainPills()}
    </ScrollView>
  );
};
