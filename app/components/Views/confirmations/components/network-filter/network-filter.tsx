import React, { useRef, useCallback, useEffect } from 'react';
import {
  Box,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { Pressable, ImageSourcePropType } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import { strings } from '../../../../../../locales/i18n';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../component-library/components/Avatars/Avatar';
import { AssetType } from '../../types/token';
import { useNetworks } from '../../hooks/send/useNetworks';
import {
  useNetworkFilter,
  NETWORK_FILTER_ALL,
} from '../../hooks/send/useNetworkFilter';
import { ScrollView } from 'react-native-gesture-handler';

interface NetworkFilterTabProps {
  label: string;
  imageSource?: ImageSourcePropType;
  isSelected: boolean;
  onPress: () => void;
  showIcon?: boolean;
}

const NetworkFilterTab: React.FC<NetworkFilterTabProps> = ({
  label,
  imageSource,
  isSelected,
  onPress,
  showIcon = false,
}) => {
  const tw = useTailwind();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) =>
        tw.style(
          'flex-row items-center px-3 py-2 mr-2 rounded-lg min-h-8 border border-border-muted',
          isSelected ? 'bg-background-pressed' : 'bg-transparent',
          pressed && 'opacity-70',
        )
      }
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
    >
      {showIcon && imageSource && (
        <Box twClassName="mr-2">
          <Avatar
            variant={AvatarVariant.Network}
            size={AvatarSize.Xs}
            imageSource={imageSource}
            name={label}
          />
        </Box>
      )}

      <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
        {label}
      </Text>
    </Pressable>
  );
};

interface NetworkFilterProps {
  tokens: AssetType[];
  onFilteredTokensChange: (filteredTokens: AssetType[]) => void;
  onNetworkFilterStateChange?: (hasActiveFilter: boolean) => void;
  onExposeFilterControls?: (clearFilters: () => void) => void;
  onNetworkFilterChange?: (networkFilter: string) => void;
}

export const NetworkFilter: React.FC<NetworkFilterProps> = ({
  tokens,
  onFilteredTokensChange,
  onNetworkFilterStateChange,
  onExposeFilterControls,
  onNetworkFilterChange,
}) => {
  const networks = useNetworks();
  const {
    selectedNetworkFilter,
    setSelectedNetworkFilter,
    filteredTokensByNetwork,
    networksWithTokens,
  } = useNetworkFilter(tokens, networks);

  const hasActiveNetworkFilter = selectedNetworkFilter !== NETWORK_FILTER_ALL;

  const scrollViewRef = useRef<ScrollView>(null);

  const clearNetworkFiltersWithScroll = useCallback(() => {
    setSelectedNetworkFilter(NETWORK_FILTER_ALL);
    scrollViewRef.current?.scrollTo({ x: 0, animated: true });
  }, [setSelectedNetworkFilter]);

  useEffect(() => {
    onNetworkFilterStateChange?.(hasActiveNetworkFilter);
  }, [hasActiveNetworkFilter, onNetworkFilterStateChange]);

  useEffect(() => {
    onExposeFilterControls?.(clearNetworkFiltersWithScroll);
  }, [clearNetworkFiltersWithScroll, onExposeFilterControls]);

  useEffect(() => {
    onFilteredTokensChange(filteredTokensByNetwork);
  }, [filteredTokensByNetwork, onFilteredTokensChange]);

  useEffect(() => {
    onNetworkFilterChange?.(selectedNetworkFilter);
  }, [selectedNetworkFilter, onNetworkFilterChange]);

  const showNetworkFilter = networksWithTokens.length > 1;

  if (!showNetworkFilter) {
    return null;
  }

  return (
    <Box twClassName="px-4 py-2">
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {/* All Networks Tab */}
        <NetworkFilterTab
          label={strings('send.all_networks')}
          isSelected={selectedNetworkFilter === NETWORK_FILTER_ALL}
          onPress={() => setSelectedNetworkFilter(NETWORK_FILTER_ALL)}
          showIcon={false}
        />

        {/* Individual Network Tabs */}
        {networksWithTokens.map((network) => (
          <NetworkFilterTab
            key={network.chainId}
            label={network.name}
            imageSource={network.image}
            isSelected={selectedNetworkFilter === network.chainId}
            onPress={() => setSelectedNetworkFilter(network.chainId)}
            showIcon
          />
        ))}
      </ScrollView>
    </Box>
  );
};

export default NetworkFilter;
