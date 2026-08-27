import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { Box } from '@metamask/design-system-react-native';
import type { DeckCard } from '../types';
import {
  DECK_ENTRANCE_STAGGER_MS,
  DECK_SPRING_CONFIG,
  STACK_PEEK_STEP,
  STACK_SCALE_STEP,
  VISIBLE_STACK_SIZE,
} from '../constants';
import SwipeableCard from './SwipeableCard';
import EmptyStateCard from './cards/EmptyStateCard';

interface DeckLayerProps {
  /** This card's fixed position in the deck (empty state = deck length). */
  deckIndex: number;
  /** Cumulative deck progress: rests at the active card's index. */
  progress: SharedValue<number>;
  /** Measured stage height, needed to anchor scaled cards to the top peek. */
  stageHeight: number;
  /** Delay (ms) for the one-shot entrance cascade; null skips the entrance. */
  entranceDelayMs: number | null;
  children: React.ReactNode;
}

/**
 * Positions one card in the stack. Styles derive from
 * `deckIndex - progress`, and `progress` never resets — while the top card
 * drags/flies away the cards behind promote continuously, and the React
 * commit that follows does not move anything (no cross-thread reset race,
 * which used to read as a one-frame "pop").
 */
const DeckLayer: React.FC<DeckLayerProps> = ({
  deckIndex,
  progress,
  stageHeight,
  entranceDelayMs,
  children,
}) => {
  const entrance = useSharedValue(entranceDelayMs === null ? 1 : 0);

  // Entrance cascade: fires on mount for the initial stack; later runs are
  // no-ops because entranceDelayMs only ever transitions to null.
  useEffect(() => {
    if (entranceDelayMs !== null) {
      entrance.value = withDelay(
        entranceDelayMs,
        withSpring(1, DECK_SPRING_CONFIG),
      );
    }
  }, [entrance, entranceDelayMs]);

  const animatedStyle = useAnimatedStyle(() => {
    const effective = Math.max(0, deckIndex - progress.value);
    const scale = interpolate(
      effective,
      [0, 1, 2],
      [1, 1 - STACK_SCALE_STEP, 1 - STACK_SCALE_STEP * 2],
      Extrapolation.CLAMP,
    );
    // Cards fill the stage, so behind-cards reveal at the top: counteract
    // the center-origin scale to pin top edges, then lift by the peek step.
    const peek = interpolate(
      effective,
      [0, 1, 2],
      [0, STACK_PEEK_STEP, STACK_PEEK_STEP * 2],
      Extrapolation.CLAMP,
    );
    const translateY = -peek - ((1 - scale) * stageHeight) / 2;
    // Hide layers deeper than the visible stack; fade the deepest one in as
    // it approaches visibility.
    const visibility = interpolate(
      effective,
      [VISIBLE_STACK_SIZE - 1, VISIBLE_STACK_SIZE],
      [1, 0],
      Extrapolation.CLAMP,
    );
    const entranceValue = entrance.value;

    return {
      opacity: visibility * entranceValue,
      zIndex: 1000 - deckIndex,
      transform: [
        { translateY: translateY + (1 - entranceValue) * 40 },
        { scale: scale * (0.9 + 0.1 * entranceValue) },
      ],
    };
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
      {children}
    </Animated.View>
  );
};

export interface CardDeckProps {
  deck: DeckCard[];
  currentIndex: number;
  onAdvance: () => void;
  /** Deals a fresh deck from the empty-state card's restart CTA. */
  onRestart: () => void;
  renderCard: (card: DeckCard, deckIndex: number) => React.ReactNode;
  /** Card width, used by the swipe gesture for thresholds/rotation. */
  cardWidth: number;
}

/**
 * Renders the visible card stack (active card + the cards behind it) plus the
 * permanent empty-state card at the very back. Only the top card owns the pan
 * gesture.
 */
const CardDeck: React.FC<CardDeckProps> = ({
  deck,
  currentIndex,
  onAdvance,
  onRestart,
  renderCard,
  cardWidth,
}) => {
  const progress = useSharedValue(currentIndex);
  // Plain state (settles once after first layout): the worklets capture it.
  const [stageHeight, setStageHeight] = useState(0);

  const handleStageLayout = useCallback((event: LayoutChangeEvent): void => {
    setStageHeight(Math.round(event.nativeEvent.layout.height));
  }, []);

  const isDeckExhausted = currentIndex >= deck.length;

  return (
    <Box twClassName="flex-1" onLayout={handleStageLayout}>
      {deck.map((card, deckIndex) => {
        const stackPosition = deckIndex - currentIndex;
        if (stackPosition < 0 || stackPosition > VISIBLE_STACK_SIZE) {
          return null;
        }
        const isTopCard = stackPosition === 0;
        const entranceDelayMs =
          currentIndex === 0 && stackPosition < VISIBLE_STACK_SIZE
            ? stackPosition * DECK_ENTRANCE_STAGGER_MS
            : null;

        return (
          <DeckLayer
            key={card.id}
            deckIndex={deckIndex}
            progress={progress}
            stageHeight={stageHeight}
            entranceDelayMs={entranceDelayMs}
          >
            {isTopCard ? (
              <SwipeableCard
                width={cardWidth}
                baseProgress={deckIndex}
                progress={progress}
                onSwiped={onAdvance}
              >
                {renderCard(card, deckIndex)}
              </SwipeableCard>
            ) : (
              renderCard(card, deckIndex)
            )}
          </DeckLayer>
        );
      })}
      {/* Permanent last card: sits behind everything, promotes naturally. */}
      {deck.length - currentIndex <= VISIBLE_STACK_SIZE && (
        <DeckLayer
          key="empty-state"
          deckIndex={deck.length}
          progress={progress}
          stageHeight={stageHeight}
          entranceDelayMs={null}
        >
          <EmptyStateCard isTop={isDeckExhausted} onRestart={onRestart} />
        </DeckLayer>
      )}
    </Box>
  );
};

export default CardDeck;
