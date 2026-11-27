import React from 'react';
import { ScrollView } from 'react-native';
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
  twClassName,
  iconName,
}) => (
  <SelectButton
    testID={testID}
    value={label}
    onPress={onPress}
    isDisabled={disabled}
    variant={SelectButtonVariant.Primary}
    startIconName={iconName}
    twClassName={twClassName ? `shrink-0 ${twClassName}` : 'shrink-0'}
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
  /** Optional testID override for the price-change button */
  priceChangeTestID?: string;
  /** Optional testID override for the network button */
  networkTestID?: string;
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
  priceChangeTestID = 'price-change-button',
  networkTestID = 'all-networks-button',
}) => {
  const tw = useTailwind();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      style={tw`flex-grow-0`}
      contentContainerStyle={tw.style(
        'flex-grow-0 flex-row items-center gap-2 px-4 pb-4',
      )}
    >
      <FilterButton
        testID={priceChangeTestID}
        label={priceChangeButtonText}
        onPress={onPriceChangePress}
        disabled={isPriceChangeDisabled}
        iconName={priceChangeIconName}
      />
      <FilterButton
        testID={networkTestID}
        label={networkName}
        onPress={onNetworkPress}
      />
      {extraFilters}
    </ScrollView>
  );
};

FilterBar.displayName = 'FilterBar';

export default FilterBar;
