import React, { useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Pressable } from 'react-native';
import { Text, TextVariant } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { selectEnabledChainRanking } from '../../../../../core/redux/slices/bridge';
import { Hex, CaipChainId } from '@metamask/utils';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
import { PopularList } from '../../../../../util/networks/customNetworks';
import { MultichainNetworkConfiguration } from '@metamask/multichain-network-controller';
import { ScrollView } from 'react-native-gesture-handler';
import { NETWORK_TO_SHORT_NETWORK_NAME_MAP } from '../../../../../constants/bridge';

const PILL_WIDTH = 90; // Average pill width including gap

export const getNetworkName = (
  chainId: Hex | CaipChainId,
  networkConfigurations: Record<string, MultichainNetworkConfiguration>,
) => {
  // Convert CAIP-2 chain ID (e.g., 'eip155:1') to hex format (e.g., '0x1') for network config lookup.
  // If it's already a hex chainId or non-EVM CAIP format, use it as-is.
  const convertedChainId: Hex | CaipChainId = chainId.startsWith('eip155:')
    ? (`0x${parseInt(chainId.split(':')[1]).toString(16)}` as Hex)
    : chainId;

  return (
    NETWORK_TO_SHORT_NETWORK_NAME_MAP[convertedChainId] ??
    networkConfigurations?.[convertedChainId]?.name ??
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
  const enabledChainRanking = useSelector(selectEnabledChainRanking);
  const networkConfigurations = useSelector(selectNetworkConfigurations);

  // Map chainRanking to include network names
  const chainRanking = useMemo(
    () =>
      (enabledChainRanking ?? []).map((chain: { chainId: CaipChainId }) => ({
        ...chain,
        name: getNetworkName(chain.chainId, networkConfigurations),
      })),
    [enabledChainRanking, networkConfigurations],
  );

  // Auto-scroll to selected network on initial layout
  const handleContentSizeChange = () => {
    if (hasScrolledRef.current || !selectedChainId) return;

    const selectedIndex = chainRanking.findIndex(
      (chain: { chainId: CaipChainId }) => chain.chainId === selectedChainId,
    );

    // Only scroll if the selected network is beyond the first 2 visible networks
    // The first few networks are already visible, no need to scroll
    if (selectedIndex > 1) {
      // Scroll to position the selected network more towards the center
      scrollViewRef.current?.scrollTo({
        x: selectedIndex * PILL_WIDTH - PILL_WIDTH,
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
    chainRanking.map((chain: { chainId: CaipChainId; name: string }) => {
      const isSelected = selectedChainId === chain.chainId;

      return (
        <Pressable
          key={chain.chainId}
          style={tw.style(
            'rounded-lg border border-border-muted px-3 py-1.5',
            isSelected ? 'bg-icon-default' : 'bg-background-default',
          )}
          onPress={() => handleChainPress(chain.chainId)}
        >
          <Text
            variant={TextVariant.BodySm}
            twClassName={isSelected ? 'text-icon-inverse' : undefined}
          >
            {chain.name}
          </Text>
        </Pressable>
      );
    });

  return (
    <ScrollView
      ref={scrollViewRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={tw.style('flex-grow-0')}
      contentContainerStyle={tw.style('flex-row items-center gap-2')}
      onContentSizeChange={handleContentSizeChange}
    >
      {/* All CTA - First pill */}
      <Pressable
        style={tw.style(
          'rounded-lg border border-border-muted px-3 py-1.5',
          !selectedChainId ? 'bg-icon-default' : 'bg-background-default',
        )}
        onPress={handleAllPress}
      >
        <Text
          variant={TextVariant.BodySm}
          twClassName={!selectedChainId ? 'text-icon-inverse' : undefined}
        >
          {strings('bridge.all')}
        </Text>
      </Pressable>
      {renderChainPills()}
    </ScrollView>
  );
};
