import React from 'react';
import { Pressable } from 'react-native';
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
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

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
/**
 * Vertical hit slop so the ~22px count row meets the ~44px touch-target
 * floor; the right slop reaches past the chevron.
 */
const COUNT_SELECTOR_HIT_SLOP = {
  top: 11,
  bottom: 11,
  left: 0,
  right: 8,
} as const;

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
  showCategoryRow = true,
  showSortRow = true,
  testID,
}) => {
  const tw = useTailwind();
  const hasProviderLogos = providerIds !== undefined && providerIds.length > 0;

  const marketCountText = (
    <>
      {/* TAT-4511: exchange mark(s) for the selected venue(s) immediately
          left of the count. PerpsProviderLogos renders nothing when no
          mark is drawable. */}
      {hasProviderLogos ? (
        <PerpsProviderLogos
          providerIds={providerIds}
          size={PERPS_AVAILABLE_BALANCE_LOGO_SIZE}
          testID={testID ? `${testID}-provider-logos` : undefined}
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
    </>
  );

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

      {/* Row 2: Market count (left) + Sort dropdown (right). With an
          exchange filter trigger, the count itself is the selector:
          [logo(s)] "N markets" [chevron] opens the exchange filter sheet
          (TAT-4511 design). Without one it is plain text. */}
      {showSortRow && (
        <Box twClassName="flex-row items-center justify-between py-1.5 pl-4 pr-1">
          {onExchangeFilterPress ? (
            <Pressable
              accessibilityRole="button"
              testID={testID ? `${testID}-exchange-filter` : undefined}
              onPress={onExchangeFilterPress}
              hitSlop={COUNT_SELECTOR_HIT_SLOP}
              style={({ pressed }) =>
                tw.style('flex-row items-center gap-1', pressed && 'opacity-70')
              }
            >
              {marketCountText}
              <Icon
                name={IconName.ArrowDown}
                size={IconSize.Sm}
                color={IconColor.IconAlternative}
                testID={
                  testID ? `${testID}-exchange-filter-chevron` : undefined
                }
              />
            </Pressable>
          ) : (
            <Box twClassName="flex-row items-center gap-1">
              {marketCountText}
            </Box>
          )}
          <Box twClassName="flex-row items-center gap-2">
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
