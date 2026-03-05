import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Icon, {
  IconName,
  IconColor,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Text from '../../../../../component-library/components/Texts/Text';

interface FilterButtonProps {
  testID: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  numberOfLines?: number;
  ellipsizeMode?: 'tail' | 'head' | 'middle' | 'clip';
  /** Extra horizontal padding (px-3) vs default (p-2) */
  wide?: boolean;
}

const FilterButton: React.FC<FilterButtonProps> = ({
  testID,
  label,
  onPress,
  disabled = false,
  numberOfLines,
  ellipsizeMode,
  wide = false,
}) => {
  const tw = useTailwind();

  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      style={tw.style(
        'min-w-0 shrink items-center rounded-lg bg-muted',
        wide ? 'py-2 px-3' : 'p-2',
        disabled && 'opacity-50',
      )}
      activeOpacity={0.2}
      disabled={disabled}
    >
      <View style={tw`flex-row items-center justify-center gap-1`}>
        <Text
          style={tw`min-w-0 shrink text-[14px] font-semibold text-default`}
          numberOfLines={numberOfLines}
          ellipsizeMode={ellipsizeMode}
        >
          {label}
        </Text>
        <Icon
          name={IconName.ArrowDown}
          color={IconColor.Alternative}
          size={IconSize.Xs}
        />
      </View>
    </TouchableOpacity>
  );
};

export interface FilterBarProps {
  priceChangeButtonText: string;
  onPriceChangePress: () => void;
  isPriceChangeDisabled?: boolean;

  networkName: string;
  onNetworkPress: () => void;

  /** Optional extra filter buttons rendered after the network button */
  extraFilters?: React.ReactNode;
}

/**
 * Shared filter toolbar used in token list views.
 * Renders price-change and network filter buttons with an optional slot
 * for view-specific extras (e.g., time filter in TrendingTokensFullView).
 */
const FilterBar: React.FC<FilterBarProps> = ({
  priceChangeButtonText,
  onPriceChangePress,
  isPriceChangeDisabled = false,
  networkName,
  onNetworkPress,
  extraFilters,
}) => {
  const tw = useTailwind();

  return (
    <View style={tw`flex-grow-0 p-4`}>
      <View style={tw`flex-row items-center justify-between`}>
        <FilterButton
          testID="price-change-button"
          label={priceChangeButtonText}
          onPress={onPriceChangePress}
          disabled={isPriceChangeDisabled}
          wide
        />
        <View style={tw`ml-2 min-w-0 shrink flex-row items-center gap-2`}>
          <FilterButton
            testID="all-networks-button"
            label={networkName}
            onPress={onNetworkPress}
            numberOfLines={1}
            ellipsizeMode="tail"
          />
          {extraFilters}
        </View>
      </View>
    </View>
  );
};

FilterBar.displayName = 'FilterBar';

export default FilterBar;
