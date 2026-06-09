import React from 'react';
import { View } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  IconName,
  SelectButton,
  SelectButtonVariant,
} from '@metamask/design-system-react-native';

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
}) => (
  <SelectButton
    testID={testID}
    placeholder={label}
    value={label}
    onPress={onPress}
    isDisabled={disabled}
    variant={SelectButtonVariant.Primary}
    startIconName={iconName}
    textProps={{
      numberOfLines,
      ellipsizeMode,
    }}
    twClassName={twClassName}
  />
);

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
      <View style={tw`flex-row items-center gap-2`}>
        <FilterButton
          testID="price-change-button"
          label={priceChangeButtonText}
          onPress={onPriceChangePress}
          disabled={isPriceChangeDisabled}
          iconName={priceChangeIconName}
          numberOfLines={1}
          ellipsizeMode="tail"
        />
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
  );
};

FilterBar.displayName = 'FilterBar';

export default FilterBar;
