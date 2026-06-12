import React, { useCallback } from 'react';
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

  const { marketData, isFetching, error, refetch } = usePredictSearchMarketData(
    {
      q: debouncedSearchQuery,
      pageSize: 20,
      refine,
      enabled: isVisible,
    },
  );

  const isSearchLoading = isDebouncing || isFetching;
  const hasSearchQuery = debouncedSearchQuery.trim().length > 0;

  const renderItem = useCallback(
    (info: { item: PredictMarketType; index: number }) => (
      <PredictMarket
        market={info.item}
        entryPoint={PredictEventValues.ENTRY_POINT.SEARCH}
        testID={getPredictSearchSelector.resultCard(info.index)}
        transactionActiveAbTests={transactionActiveAbTests}
      />
    ),
    [transactionActiveAbTests],
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
