import React, { forwardRef, useCallback, useImperativeHandle } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box } from '@metamask/design-system-react-native';
import SectionTitle from '../../components/SectionTitle';
import Routes from '../../../../../constants/navigation/Routes';
import { SectionRefreshHandle } from '../../types';
import { selectPredictEnabledFlag } from '../../../../UI/Predict';
import { usePredictMarketsForHomepage } from './hooks';
import { PredictMarketCard, PredictMarketCardSkeleton } from './components';

const MAX_PREDICTIONS_DISPLAYED = 5;
const TITLE = 'Hottest predictions';

// Card dimensions for snap offsets
const CARD_WIDTH = 280;
const GAP = 12;
const PADDING = 16; // px-4

// Calculate snap offsets: first card at 0, then padding + card + (gap + card) * n
const SNAP_OFFSETS = Array.from(
  { length: MAX_PREDICTIONS_DISPLAYED },
  (_, i) => (i === 0 ? 0 : PADDING + CARD_WIDTH + (GAP + CARD_WIDTH) * (i - 1)),
);

// Skeleton keys for loading state
const SKELETON_KEYS = Array.from(
  { length: MAX_PREDICTIONS_DISPLAYED },
  (__, i) => `skeleton-${i}`,
);

/**
 * PredictionsSection - Displays trending prediction markets on the homepage
 * using a lightweight cached approach for faster loading.
 *
 * This section shows the top 5 prediction markets as compact horizontal cards.
 * Returns null if the Predict feature flag is disabled.
 */
const PredictionsSection = forwardRef<SectionRefreshHandle>((_, ref) => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const isPredictEnabled = useSelector(selectPredictEnabledFlag);
  const { markets, isLoading, refresh } = usePredictMarketsForHomepage(
    MAX_PREDICTIONS_DISPLAYED,
  );

  useImperativeHandle(ref, () => ({ refresh }), [refresh]);

  const handleViewAllPredictions = useCallback(() => {
    navigation.navigate(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
    });
  }, [navigation]);

  // Don't render if Predict is disabled
  if (!isPredictEnabled) {
    return null;
  }

  return (
    <Box gap={3}>
      <SectionTitle title={TITLE} onPress={handleViewAllPredictions} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tw.style('px-4 gap-3')}
        snapToOffsets={SNAP_OFFSETS}
        decelerationRate="fast"
      >
        {isLoading
          ? SKELETON_KEYS.map((key) => <PredictMarketCardSkeleton key={key} />)
          : markets.map((market) => (
              <PredictMarketCard key={market.id} market={market} />
            ))}
      </ScrollView>
    </Box>
  );
});

export default PredictionsSection;
