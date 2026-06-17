import React, { useCallback, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { FlashList } from '@shopify/flash-list';
import { usePredictSearchMarketData } from '../../hooks/usePredictSearchMarketData';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import { deduplicateSeriesMarkets } from '../../utils/feed';
import { selectPredictUpDownEnabledFlag } from '../../selectors/featureFlags';
import { PredictMarket as PredictMarketType } from '../../types';
import { PredictEventValues } from '../../constants/eventNames';
import PredictMarket from '../PredictMarket';
import PredictMarketSkeleton from '../PredictMarketSkeleton';
import PredictOffline from '../PredictOffline';
import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import { useTheme } from '../../../../../util/theme';
import HeaderSearch, {
  HeaderSearchVariant,
} from '../../../../../component-library/components-temp/HeaderSearch';
import {
  PredictSearchSelectorsIDs,
  getPredictSearchSelector,
  getPredictFeedSelector,
} from '../../Predict.testIds';
import type { TransactionActiveAbTestEntry } from '../../../../../util/transactions/transaction-active-ab-test-attribution-registry';

export interface PredictSearchOverlayProps {
  isVisible: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClose: () => void;
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
  /** Active feed tab when search was opened (omitted on the tab-less home). */
  predictFeedTab?: string;
  /** How the user entered the surface where search was opened. */
  entryPoint?: string;
}

const SEARCH_DEBOUNCE_MS = 200;

/**
 * Full-screen Predict search overlay.
 *
 * Shared between the legacy `PredictFeed` and the redesigned `PredictHome`
 * shell so the search UX has a single source of truth (behavior unchanged from
 * the original inline `PredictFeed` implementation).
 */
const PredictSearchOverlay: React.FC<PredictSearchOverlayProps> = ({
  isVisible,
  searchQuery,
  onSearchChange,
  onClose,
  transactionActiveAbTests,
  predictFeedTab,
  entryPoint,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const debouncedSearchQuery = useDebouncedValue(
    searchQuery,
    SEARCH_DEBOUNCE_MS,
  );
  const isDebouncing = searchQuery !== debouncedSearchQuery;

  const upDownEnabled = useSelector(selectPredictUpDownEnabledFlag);
  const refine = upDownEnabled ? deduplicateSeriesMarkets : undefined;

  const { marketData, totalResults, isFetching, error, refetch } =
    usePredictSearchMarketData({
      q: debouncedSearchQuery,
      pageSize: 20,
      refine,
      enabled: isVisible,
    });

  const isSearchLoading = isDebouncing || isFetching;
  const hasSearchQuery = debouncedSearchQuery.trim().length > 0;

  // Fire `queried` once per resolved (non-empty) query — i.e. after debounce
  // settles and the fetch completes without error. The ref guards against
  // re-firing for the same query when `marketData` re-renders, but clearing the
  // live input resets the guard immediately so the same term can be tracked if
  // the user searches again without closing the overlay.
  const lastTrackedQueryRef = useRef<string | null>(null);
  useEffect(() => {
    if (!searchQuery.trim()) {
      lastTrackedQueryRef.current = null;
    }
  }, [searchQuery]);

  useEffect(() => {
    if (!isVisible) {
      lastTrackedQueryRef.current = null;
      return;
    }
    const q = debouncedSearchQuery.trim();
    if (!q || isSearchLoading || error || lastTrackedQueryRef.current === q) {
      return;
    }
    lastTrackedQueryRef.current = q;
    Engine.context.PredictController.trackSearchInteracted({
      interactionType: PredictEventValues.SEARCH_INTERACTION.QUERIED,
      predictFeedTab,
      entryPoint,
      searchQuery: q,
      // Report the server's total match count, not the visible page length.
      // `marketData` is capped at `pageSize` and post-dedup, so it undercounts
      // any query matching more results than the first page holds.
      resultsCount: totalResults,
    });
  }, [
    isVisible,
    debouncedSearchQuery,
    isSearchLoading,
    error,
    totalResults,
    predictFeedTab,
    entryPoint,
  ]);

  const handleResultPress = useCallback(
    (market: PredictMarketType) => {
      Engine.context.PredictController.trackSearchInteracted({
        interactionType: PredictEventValues.SEARCH_INTERACTION.RESULT_CLICKED,
        predictFeedTab,
        entryPoint,
        searchQuery: debouncedSearchQuery.trim(),
        marketId: market.id,
        marketTitle: market.title,
      });
    },
    [predictFeedTab, entryPoint, debouncedSearchQuery],
  );

  const renderItem = useCallback(
    (info: { item: PredictMarketType; index: number }) => (
      <PredictMarket
        market={info.item}
        entryPoint={PredictEventValues.ENTRY_POINT.SEARCH}
        testID={getPredictSearchSelector.resultCard(info.index)}
        predictFeedTab={predictFeedTab}
        transactionActiveAbTests={transactionActiveAbTests}
        onCardPress={() => handleResultPress(info.item)}
      />
    ),
    [predictFeedTab, transactionActiveAbTests, handleResultPress],
  );

  const keyExtractor = useCallback((item: PredictMarketType) => item.id, []);

  if (!isVisible) {
    return null;
  }

  return (
    <Box
      style={tw.style('absolute inset-0 z-20', {
        paddingTop: insets.top,
        backgroundColor: colors.background.default,
      })}
    >
      <Box twClassName="w-full py-2">
        <HeaderSearch
          variant={HeaderSearchVariant.Inline}
          onPressCancelButton={onClose}
          cancelButtonProps={{
            // ButtonBase applies self-start when not full width, which top-aligns the
            // Cancel control vs. the centered TextFieldSearch row.
            style: { alignSelf: 'center' },
          }}
          textFieldSearchProps={{
            value: searchQuery,
            onChangeText: onSearchChange,
            onPressClearButton: () => onSearchChange(''),
            placeholder: strings('predict.search_placeholder'),
            autoFocus: true,
            clearButtonProps: {
              testID: PredictSearchSelectorsIDs.CLEAR_BUTTON,
            },
          }}
        />
      </Box>

      <Box twClassName="flex-1">
        {isSearchLoading ? (
          <Box twClassName="px-4">
            <PredictMarketSkeleton
              testID={getPredictFeedSelector.searchSkeleton(1)}
            />
            <PredictMarketSkeleton
              testID={getPredictFeedSelector.searchSkeleton(2)}
            />
            <PredictMarketSkeleton
              testID={getPredictFeedSelector.searchSkeleton(3)}
            />
          </Box>
        ) : error && hasSearchQuery ? (
          <PredictOffline onRetry={refetch} />
        ) : !marketData || marketData.length === 0 ? (
          hasSearchQuery ? (
            <Box twClassName="flex-1 justify-center items-center p-8">
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.PrimaryAlternative}
              >
                {strings('predict.search_no_markets_found', {
                  q: searchQuery,
                })}
              </Text>
            </Box>
          ) : null
        ) : (
          <FlashList<PredictMarketType>
            data={marketData}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={tw.style('px-4 pb-4')}
            showsVerticalScrollIndicator={false}
          />
        )}
      </Box>
    </Box>
  );
};

export default PredictSearchOverlay;
