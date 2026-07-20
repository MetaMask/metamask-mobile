import React from 'react';
import { ScrollView } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  FilterButton as FilterPillButton,
  IconName,
  SelectButton,
  SelectButtonVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';

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

  /** When true, renders the watchlist star filter before other pills. */
  showWatchlistFilter?: boolean;
  /** Whether the watchlist filter is currently active. */
  isWatchlistFilterActive?: boolean;
  /** Called when the watchlist star filter is pressed (toggle). */
  onWatchlistFilterPress?: () => void;
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
  showWatchlistFilter = false,
  isWatchlistFilterActive = false,
  onWatchlistFilterPress,
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
      {showWatchlistFilter && onWatchlistFilterPress ? (
        <FilterPillButton
          isSelected={isWatchlistFilterActive}
          startIconName={IconName.StarFilled}
          onPress={onWatchlistFilterPress}
          testID="trending-watchlist-filter-watchlist"
          accessibilityLabel={strings('perps.watchlist.filter_badge_label')}
          contentWrapperProps={{ gap: 0 }}
          twClassName={
            isWatchlistFilterActive ? undefined : 'bg-background-muted'
          }
        >
          {null}
        </FilterPillButton>
      ) : null}
      <FilterButton
        testID={priceChangeTestID}
        label={priceChangeButtonText}
        onPress={onPriceChangePress}
        disabled={isPriceChangeDisabled}
        iconName={priceChangeIconName}
        numberOfLines={1}
        ellipsizeMode="tail"
      />
      <FilterButton
        testID={networkTestID}
        label={networkName}
        onPress={onNetworkPress}
        numberOfLines={1}
        ellipsizeMode="tail"
      />
      {extraFilters}
    </ScrollView>
  );
};

FilterBar.displayName = 'FilterBar';

export default FilterBar;
