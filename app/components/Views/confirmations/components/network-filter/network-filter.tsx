import React, { useRef, useCallback, useEffect } from 'react';
import {
  AvatarBaseShape,
  AvatarNetwork,
  AvatarNetworkSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
  type ImageOrSvgSrc,
} from '@metamask/design-system-react-native';
import { ImageSourcePropType } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import { strings } from '../../../../../../locales/i18n';
import ButtonToggle from '../../../../../component-library/components-temp/Buttons/ButtonToggle';
import { ButtonSize } from '../../../../../component-library/components/Buttons/Button';
import { AssetType } from '../../types/token';
import { useNetworks } from '../../hooks/send/useNetworks';
import {
  useNetworkFilter,
  NETWORK_FILTER_ALL,
} from '../../hooks/send/useNetworkFilter';
import { ScrollView } from 'react-native-gesture-handler';
import {
  getNetworkFilterTestId,
  NETWORK_FILTER_ALL_TEST_ID,
} from './network-filter.testIds';

interface NetworkFilterTabProps {
  label: string;
  imageSource?: ImageSourcePropType;
  isSelected: boolean;
  onPress: () => void;
  showIcon?: boolean;
  testID: string;
}

const NetworkFilterTab: React.FC<NetworkFilterTabProps> = ({
  label,
  imageSource,
  isSelected,
  onPress,
  showIcon = false,
  testID,
}) => {
  const tw = useTailwind();

  if (!showIcon || !imageSource) {
    return (
      <ButtonToggle
        label={label}
        isActive={isSelected}
        onPress={onPress}
        size={ButtonSize.Md}
        style={tw.style('rounded-xl py-2 px-3')}
        testID={testID}
      />
    );
  }

  return (
    <ButtonToggle
      label={
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={2}
        >
          <AvatarNetwork
            src={imageSource as ImageOrSvgSrc}
            size={AvatarNetworkSize.Xs}
            name={label}
            shape={AvatarBaseShape.Square}
            twClassName="rounded translate-y-px"
          />
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={
              isSelected ? TextColor.PrimaryInverse : TextColor.TextDefault
            }
          >
            {label}
          </Text>
        </Box>
      }
      isActive={isSelected}
      onPress={onPress}
      size={ButtonSize.Md}
      style={tw.style('rounded-xl py-2 px-3')}
      testID={testID}
    />
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
  const tw = useTailwind();

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
    <Box twClassName="pl-4 py-2">
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={tw.style('flex-grow-0')}
        contentContainerStyle={tw.style('flex-row items-center gap-2')}
      >
        <NetworkFilterTab
          label={strings('send.all_networks')}
          isSelected={selectedNetworkFilter === NETWORK_FILTER_ALL}
          onPress={() => setSelectedNetworkFilter(NETWORK_FILTER_ALL)}
          showIcon={false}
          testID={NETWORK_FILTER_ALL_TEST_ID}
        />

        {networksWithTokens.map((network) => (
          <NetworkFilterTab
            key={network.chainId}
            label={network.name}
            imageSource={network.image}
            isSelected={selectedNetworkFilter === network.chainId}
            onPress={() => setSelectedNetworkFilter(network.chainId)}
            showIcon
            testID={getNetworkFilterTestId(network.chainId)}
          />
        ))}
      </ScrollView>
    </Box>
  );
};

export default NetworkFilter;
