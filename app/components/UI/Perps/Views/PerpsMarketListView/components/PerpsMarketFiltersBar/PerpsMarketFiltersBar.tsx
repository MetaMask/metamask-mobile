import React from 'react';
import { strings } from '../../../../../../../../locales/i18n';
import PerpsMarketSortDropdowns from '../../../../components/PerpsMarketSortDropdowns';
import PerpsMarketCategoryBadges from '../../../../components/PerpsMarketCategoryBadges';
import PerpsProviderLogos from '../../../../components/PerpsProviderLogos';
import { PERPS_AVAILABLE_BALANCE_LOGO_SIZE } from '../../../../constants/perpsUIConfig';
import type { PerpsMarketFiltersBarProps } from './PerpsMarketFiltersBar.types';
import {
  Box,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  SelectButton,
  SelectButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

/**
 * PerpsMarketFiltersBar Component
 *
 * Two-row filter bar for the markets list:
 * - Row 1: Category badges (Crypto, Stocks, Commodities, Forex)
 * - Row 2: Sort dropdown (volume, price change, funding rate, etc.)
 *
 * Both rows render by default; pass `showCategoryRow={false}` or
 * `showSortRow={false}` to render just one row (e.g. so a caller can
 * place other content — like a rail — between the two rows).
 *
 * @example
 * ```tsx
 * <PerpsMarketFiltersBar
 *   selectedOptionId="volume"
 *   onSortPress={() => setSheetVisible(true)}
 *   marketTypeFilter="all"
 *   onCategorySelect={handleCategorySelect}
 * />
 * ```
 */
const PerpsMarketFiltersBar: React.FC<PerpsMarketFiltersBarProps> = ({
  selectedOptionId,
  onSortPress,
  sortDirection,
  marketTypeFilter,
  onCategorySelect,
  marketCount,
  providerIds,
  showWatchlistBadge,
  isWatchlistSelected,
  onWatchlistToggle,
  onExchangeFilterPress,
  exchangeFilterLabel,
  showCategoryRow = true,
  showSortRow = true,
  testID,
}) => {
  const hasProviderLogos = providerIds !== undefined && providerIds.length > 0;

  return (
    <Box twClassName="w-full bg-default" testID={testID}>
      {/* Row 1: Category Badges (+ optional watchlist star badge) */}
      {showCategoryRow && (
        <PerpsMarketCategoryBadges
          selectedCategory={marketTypeFilter}
          onCategorySelect={onCategorySelect}
          showWatchlistBadge={showWatchlistBadge}
          isWatchlistSelected={isWatchlistSelected}
          onWatchlistToggle={onWatchlistToggle}
          testID={testID ? `${testID}-categories` : undefined}
        />
      )}

      {/* Row 2: Market count (left) + Sort dropdown (right) */}
      {showSortRow && (
        <Box twClassName="flex-row items-center justify-between py-1.5 pl-4 pr-1">
          <Box twClassName="flex-row items-center">
            {/* TAT-4511: exchange mark(s) immediately left of the count.
                PerpsProviderLogos renders nothing when no mark is drawable. */}
            {hasProviderLogos ? (
              <PerpsProviderLogos
                providerIds={providerIds}
                size={PERPS_AVAILABLE_BALANCE_LOGO_SIZE}
                testID={testID ? `${testID}-provider-logos` : undefined}
                twClassName="mr-1"
              />
            ) : null}
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              fontWeight={FontWeight.Medium}
              testID={testID ? `${testID}-market-count` : undefined}
            >
              {marketCount === 1
                ? strings('perps.market_count', { count: marketCount })
                : strings('perps.market_count_plural', { count: marketCount })}
            </Text>
          </Box>
          <Box twClassName="flex-row items-center gap-2">
            {onExchangeFilterPress ? (
              <SelectButton
                testID={testID ? `${testID}-exchange-filter` : undefined}
                variant={SelectButtonVariant.Secondary}
                placeholder={exchangeFilterLabel ?? ''}
                value={exchangeFilterLabel ?? ''}
                onPress={onExchangeFilterPress}
                hideEndArrow
                textProps={{
                  variant: TextVariant.BodyMd,
                  fontWeight: FontWeight.Medium,
                  numberOfLines: 1,
                }}
                endAccessory={
                  <Icon
                    name={IconName.ArrowDown}
                    size={IconSize.Sm}
                    color={IconColor.IconAlternative}
                  />
                }
              />
            ) : null}
            <PerpsMarketSortDropdowns
              selectedOptionId={selectedOptionId}
              onSortPress={onSortPress}
              sortDirection={sortDirection}
              testID={testID ? `${testID}-sort` : undefined}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default PerpsMarketFiltersBar;
