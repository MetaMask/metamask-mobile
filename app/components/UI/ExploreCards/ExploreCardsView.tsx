import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonBaseSize,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  IconName,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import { useHaptics } from '../../../util/haptics';
import { PredictPreviewSheetProvider } from '../Predict/contexts';
import PerpsSectionProvider from '../../Views/TrendingView/feeds/perps/PerpsSectionProvider';
import { useExploreCardsDeck } from './hooks/useExploreCardsDeck';
import {
  clearDeckCompleted,
  isDeckCompletedThisHour,
  markDeckCompleted,
} from './utils/exploreCardsSession';
import {
  trackExploreCardsDeckCompleted,
  trackExploreCardsDeckRestarted,
} from './utils/exploreCardsAnalytics';
import type { DeckCard } from './types';
import CardDeck from './components/CardDeck';
import DeckProgressBar from './components/DeckProgressBar';
import CryptoCard from './components/cards/CryptoCard';
import PerpCard from './components/cards/PerpCard';
import PredictionCard from './components/cards/PredictionCard';
import NewsCard from './components/cards/NewsCard';
import TraderCard from './components/cards/TraderCard';
import EmptyStateCard from './components/cards/EmptyStateCard';

/** Must match the stage Box's `px-3`. */
const CARD_STAGE_HORIZONTAL_PADDING = 12;

const styles = StyleSheet.create({
  fill: { flex: 1 },
});

const renderDeckCard = (card: DeckCard, deckIndex: number): React.ReactNode => {
  const rank = deckIndex + 1;
  switch (card.type) {
    case 'crypto':
      return <CryptoCard token={card.data} rank={rank} />;
    case 'perp':
      return <PerpCard market={card.data} rank={rank} />;
    case 'prediction':
      return <PredictionCard market={card.data} rank={rank} />;
    case 'news':
      return (
        <NewsCard item={card.data} feedIndex={card.feedIndex} rank={rank} />
      );
    case 'trader':
      return <TraderCard trader={card.data} rank={rank} />;
    default:
      return null;
  }
};

/** Shimmering 3-card skeleton stack shown while the deck is composing. */
const DeckSkeleton: React.FC = () => {
  const tw = useTailwind();
  return (
    <Box twClassName="flex-1">
      {[2, 1, 0].map((depth) => (
        <Skeleton
          key={depth}
          style={[
            tw.style('absolute inset-0 rounded-3xl'),
            {
              transform: [
                { translateY: depth * 16 },
                { scale: 1 - depth * 0.05 },
              ],
              opacity: 1 - depth * 0.25,
            },
          ]}
        />
      ))}
    </Box>
  );
};

const ErrorCard: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <Box twClassName="flex-1 rounded-3xl bg-default border border-muted p-5 items-center justify-center gap-3">
    <Text
      variant={TextVariant.HeadingMd}
      fontWeight={FontWeight.Bold}
      twClassName="text-center"
    >
      {strings('explore_cards.error_title')}
    </Text>
    <Text
      variant={TextVariant.BodyMd}
      color={TextColor.TextAlternative}
      twClassName="text-center"
    >
      {strings('explore_cards.error_body')}
    </Text>
    <Box twClassName="w-full mt-2">
      <Button size={ButtonBaseSize.Lg} isFullWidth onPress={onRetry}>
        {strings('explore_cards.error_retry')}
      </Button>
    </Box>
  </Box>
);

const ExploreCardsContent: React.FC = () => {
  const navigation = useNavigation();
  const { width: screenWidth } = useWindowDimensions();
  const { playSuccessNotification } = useHaptics();
  const { deck, isLoading, isError, retry, reshuffle } = useExploreCardsDeck();

  // Completing the deck and reopening within the same hour skips straight to
  // the empty state (in-memory only; see exploreCardsSession).
  const [skipToEmpty, setSkipToEmpty] = useState(isDeckCompletedThisHour);
  const [currentIndex, setCurrentIndex] = useState(0);
  // Bumped on restart so CardDeck fully remounts and replays its entrance.
  const [deckGeneration, setDeckGeneration] = useState(0);

  const cardWidth = screenWidth - CARD_STAGE_HORIZONTAL_PADDING * 2;

  const handleAdvance = useCallback(() => {
    setCurrentIndex((index) => index + 1);
  }, []);

  const handleRestart = useCallback(() => {
    trackExploreCardsDeckRestarted();
    clearDeckCompleted();
    reshuffle();
    setCurrentIndex(0);
    setSkipToEmpty(false);
    setDeckGeneration((generation) => generation + 1);
  }, [reshuffle]);

  const deckLength = deck?.length ?? 0;
  const isDeckComplete =
    !skipToEmpty && deckLength > 0 && currentIndex >= deckLength;

  useEffect(() => {
    if (!isDeckComplete) return;
    markDeckCompleted();
    trackExploreCardsDeckCompleted();
    void playSuccessNotification();
  }, [isDeckComplete, playSuccessNotification]);

  const showDeck = !skipToEmpty && !isLoading && !isError && deck !== null;
  const progress = Math.min(currentIndex, deckLength);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.fill}>
      <Box twClassName="flex-1 bg-default">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="px-4 py-2"
        >
          <ButtonIcon
            iconName={IconName.Close}
            size={ButtonIconSize.Lg}
            onPress={() => navigation.goBack()}
            testID="explore-cards-close-button"
          />
          <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
            {strings('explore_cards.screen_title')}
          </Text>
          <Box twClassName="min-w-[48px] items-end">
            {showDeck && deckLength > 0 && (
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {strings('explore_cards.progress_label', {
                  current: Math.min(currentIndex + 1, deckLength),
                  total: deckLength,
                })}
              </Text>
            )}
          </Box>
        </Box>

        {showDeck && deckLength > 0 && (
          <DeckProgressBar progress={progress} total={deckLength} />
        )}

        {/* pt-6 gives the behind-cards' top peek (2 × 12pt) headroom;
            cards otherwise fill the stage so CTAs land in the thumb zone. */}
        <Box twClassName="flex-1 px-3 pt-6 pb-3 items-center">
          <Box twClassName="flex-1 w-full">
            {skipToEmpty ? (
              <EmptyStateCard isTop onRestart={handleRestart} />
            ) : isLoading ? (
              <DeckSkeleton />
            ) : isError ? (
              <ErrorCard onRetry={retry} />
            ) : (
              deck && (
                <CardDeck
                  key={deckGeneration}
                  deck={deck}
                  currentIndex={currentIndex}
                  onAdvance={handleAdvance}
                  onRestart={handleRestart}
                  renderCard={renderDeckCard}
                  cardWidth={cardWidth}
                />
              )
            )}
          </Box>
        </Box>
      </Box>
    </SafeAreaView>
  );
};

/**
 * Full-screen swipeable "Top 10 right now" deck.
 *
 * Wrapped in its own PredictPreviewSheetProvider (the MainNavigator instance
 * only covers the home Tab.Navigator — this root-level sibling screen does
 * not inherit it) and PerpsSectionProvider (usePerpsTopMovers needs the perps
 * connection + stream contexts).
 */
const ExploreCardsView: React.FC = () => (
  <PerpsSectionProvider>
    <PredictPreviewSheetProvider>
      <ExploreCardsContent />
    </PredictPreviewSheetProvider>
  </PerpsSectionProvider>
);

export default ExploreCardsView;
