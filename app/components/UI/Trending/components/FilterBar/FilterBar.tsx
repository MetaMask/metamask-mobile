import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Icon, {
  IconName,
  IconColor,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Text from '../../../../../component-library/components/Texts/Text';

export interface FilterButtonProps {
  testID: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  numberOfLines?: number;
  ellipsizeMode?: 'tail' | 'head' | 'middle' | 'clip';
  /** Optional Tailwind class overrides for layout in custom contexts */
  twClassName?: string;
  /** Optional icon name to show before the label (e.g., for sort direction indicators) */
  iconName?: IconName;
}

export const FilterButton: React.FC<FilterButtonProps> = ({
  testID,
  label,
  onPress,
  disabled = false,
  numberOfLines,
  ellipsizeMode,
  twClassName,
  iconName,
}) => {
  const tw = useTailwind();

  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      style={tw.style(
        'min-w-0 shrink flex-row items-center justify-center gap-1 rounded-xl bg-muted',
        'py-2 px-3',
        disabled && 'opacity-50',
        twClassName,
      )}
      activeOpacity={0.2}
      disabled={disabled}
    >
      {iconName && (
        <Icon name={iconName} color={IconColor.Default} size={IconSize.Sm} />
      )}
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
    </TouchableOpacity>
  );
};

export interface FilterBarProps {
  priceChangeButtonText: string;
  onPriceChangePress: () => void;
  isPriceChangeDisabled?: boolean;
  /** Optional icon name for the price change button */
  priceChangeIconName?: IconName;

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
  priceChangeIconName,
  networkName,
  onNetworkPress,
  extraFilters,
}) => {
  const tw = useTailwind();

  return (
    <View style={tw`flex-grow-0 px-4 pb-4`}>
      <View style={tw`flex-row items-center justify-between`}>
        <FilterButton
          testID="price-change-button"
          label={priceChangeButtonText}
          onPress={onPriceChangePress}
          disabled={isPriceChangeDisabled}
          iconName={priceChangeIconName}
          numberOfLines={1}
          ellipsizeMode="tail"
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
