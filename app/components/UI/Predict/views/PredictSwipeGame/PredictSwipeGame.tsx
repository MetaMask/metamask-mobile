import React, { useCallback, useMemo, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  ActivityIndicator,
  Pressable,
  Dimensions,
  Image,
  ScrollView,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolate,
  useSharedValue,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import {
  GestureDetector,
  GestureHandlerRootView,
  Gesture,
} from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Text,
  TextVariant,
  FontWeight,
  Icon,
  IconName,
  IconColor,
  IconSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../util/theme';
import { useSwipeGame } from './hooks/useSwipeGame';
import { useSwipeGesture } from './hooks/useSwipeGesture';
import { useUndoToast } from './hooks/useUndoToast';
import { useSwipeFeedback } from './hooks/useSwipeFeedback';
import { SwipeCard } from './components/SwipeCard';
import { UndoToast } from './components/UndoToast';
import {
  SWIPE_GAME_TEST_IDS,
  VISIBLE_STACK_COUNT,
  CARD_ANIMATION,
  BET_AMOUNTS,
  DEFAULT_GESTURE_CONFIG,
} from './PredictSwipeGame.constants';
import type { SwipeGameCard, CardPreview } from './PredictSwipeGame.types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Pastel orange background for the game
const PASTEL_ORANGE_BG = '#FFF5EB';

// Animation timing for stack transitions
const STACK_TIMING = {
  duration: 250,
  easing: Easing.out(Easing.cubic),
};

// Empty gesture for non-active cards (keeps same component structure)
const emptyGesture = Gesture.Manual();

/**
 * Unified stack card that handles both active and background states
 * Uses same component structure to prevent unmount/remount when transitioning
 */
interface UnifiedStackCardProps {
  card: SwipeGameCard;
  stackIndex: number;
  isActive: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  gesture: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cardAnimatedStyle: any;
  betAmount: number;
  preview: CardPreview | null;
  onOutcomeChange?: (outcomeId: string) => void;
  overlay?: React.ReactNode;
}

const UnifiedStackCard: React.FC<UnifiedStackCardProps> = React.memo(({
  card,
  stackIndex,
  isActive,
  gesture,
  cardAnimatedStyle,
  betAmount,
  preview,
  onOutcomeChange,
  overlay,
}) => {
  // Animated values for smooth transitions
  const animatedScale = useSharedValue(
    isActive ? 1 : 1 - stackIndex * CARD_ANIMATION.STACK_SCALE_DECREASE
  );
  const animatedTranslateY = useSharedValue(
    isActive ? 0 : stackIndex * CARD_ANIMATION.STACK_OFFSET_Y
  );

  // Animate when stack position changes
  React.useEffect(() => {
    const targetScale = isActive ? 1 : 1 - stackIndex * CARD_ANIMATION.STACK_SCALE_DECREASE;
    const targetTranslateY = isActive ? 0 : stackIndex * CARD_ANIMATION.STACK_OFFSET_Y;

    animatedScale.value = withTiming(targetScale, STACK_TIMING);
    animatedTranslateY.value = withTiming(targetTranslateY, STACK_TIMING);
  }, [stackIndex, isActive, animatedScale, animatedTranslateY]);

  // Stack position animation for background cards
  const stackStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: animatedScale.value },
      { translateY: animatedTranslateY.value },
    ],
  }));

  const zIndex = VISIBLE_STACK_COUNT + 1 - stackIndex;

  return (
    <GestureDetector gesture={isActive ? gesture : emptyGesture}>
      <Animated.View
        style={[
          styles.activeCard,
          isActive ? cardAnimatedStyle : stackStyle,
          { zIndex },
        ]}
      >
        <SwipeCard
          card={card}
          preview={isActive ? preview : null}
          betAmount={betAmount}
          isActive={isActive}
          onOutcomeChange={isActive ? onOutcomeChange : undefined}
          overlay={isActive ? overlay : undefined}
        />
      </Animated.View>
    </GestureDetector>
  );
});

/**
 * PredictSwipeGame - Tinder-style betting game for prediction markets
 *
 * Swipe RIGHT → YES bet (positive action)
 * Swipe LEFT → NO bet (negative action)
 * Swipe UP/DOWN → Skip
 */
const PredictSwipeGame: React.FC = () => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // Bet amount selector visibility
  const [showBetSelector, setShowBetSelector] = useState(false);

  // Game state and actions
  const {
    cards,
    currentCard,
    currentIndex,
    betAmount,
    isLoading,
    isPendingOrder,
    error,
    orderError,
    sessionStats,
    hasMoreCards,
    remainingCards,
    balance,
    isBalanceLoading,
    hasInsufficientBalance,
    canPlaceBet,
    currentPreview,
    isPreviewLoading,
    lastBet,
    handleSwipeRight,
    handleSwipeLeft,
    handleSwipeDown,
    handleUndo,
    setBetAmount,
    clearOrderError,
    selectOutcome,
  } = useSwipeGame();

  // Haptic feedback
  const { triggerHaptic } = useSwipeFeedback();

  // Undo toast management
  const {
    toastState,
    showToast,
    hideToast,
    handleUndo: handleToastUndo,
  } = useUndoToast(handleUndo);

  // Show toast when bet is placed
  useEffect(() => {
    if (lastBet) {
      showToast({
        betType: lastBet.type,
        marketTitle: lastBet.marketTitle,
        betAmount: lastBet.betAmount,
        potentialWin: lastBet.potentialWin,
      });
      triggerHaptic(lastBet.type);
    }
  }, [lastBet, showToast, triggerHaptic]);

  // Swipe gesture handling with haptic feedback
  const handleSwipeRightWithHaptic = useCallback(() => {
    if (!canPlaceBet) {
      triggerHaptic('error');
      return;
    }
    handleSwipeRight();
  }, [canPlaceBet, handleSwipeRight, triggerHaptic]);

  const handleSwipeLeftWithHaptic = useCallback(() => {
    if (!canPlaceBet) {
      triggerHaptic('error');
      return;
    }
    handleSwipeLeft();
  }, [canPlaceBet, handleSwipeLeft, triggerHaptic]);

  const handleSwipeDownWithHaptic = useCallback(() => {
    triggerHaptic('skip');
    handleSwipeDown();
  }, [handleSwipeDown, triggerHaptic]);

  const { gesture, cardAnimatedStyle, translateX, translateY, swipeProgress } =
    useSwipeGesture({
      onSwipeRight: handleSwipeRightWithHaptic,
      onSwipeLeft: handleSwipeLeftWithHaptic,
      onSwipeDown: handleSwipeDownWithHaptic,
      enabled: hasMoreCards && !isLoading && !isPendingOrder,
      cardKey: currentCard?.marketId,
    });

  // Go back
  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Get visible cards for the stack
  const visibleCards = useMemo(() => cards.slice(currentIndex, currentIndex + VISIBLE_STACK_COUNT + 1), [cards, currentIndex]);

  // Prefetch images for visible and upcoming cards to prevent reload flash
  useEffect(() => {
    // Prefetch visible cards + a few ahead
    const prefetchCount = VISIBLE_STACK_COUNT + 3;
    const cardsToPrefetch = cards.slice(
      currentIndex,
      currentIndex + prefetchCount,
    );

    cardsToPrefetch.forEach((card) => {
      if (card.image) {
        Image.prefetch(card.image).catch(() => {
          // Silently ignore prefetch errors
        });
      }
    });
  }, [cards, currentIndex]);

  // Calculate potential wins from preview data
  const yesPotentialWin = currentPreview?.yesPreview
    ? (currentPreview.yesPreview.potentialWin + betAmount).toFixed(2)
    : currentCard
      ? ((1 / currentCard.primaryOutcome.yesToken.price) * betAmount).toFixed(2)
      : '0.00';
  const noPotentialWin = currentPreview?.noPreview
    ? (currentPreview.noPreview.potentialWin + betAmount).toFixed(2)
    : currentCard
      ? ((1 / currentCard.primaryOutcome.noToken.price) * betAmount).toFixed(2)
      : '0.00';

  // Animated overlay styles based on swipe direction (mutually exclusive)
  const yesOverlayStyle = useAnimatedStyle(() => {
    const absX = Math.abs(translateX.value);
    const absY = Math.abs(translateY.value);
    // Only show if horizontal is dominant
    const isHorizontalDominant = absX > absY;
    const isSwipingRight = translateX.value > 0;

    const opacity =
      isHorizontalDominant && isSwipingRight
        ? interpolate(
            translateX.value,
            [0, DEFAULT_GESTURE_CONFIG.horizontalThreshold],
            [0, 0.85],
            Extrapolate.CLAMP,
          )
        : 0;
    return { opacity };
  });

  const noOverlayStyle = useAnimatedStyle(() => {
    const absX = Math.abs(translateX.value);
    const absY = Math.abs(translateY.value);
    // Only show if horizontal is dominant
    const isHorizontalDominant = absX > absY;
    const isSwipingLeft = translateX.value < 0;

    const opacity =
      isHorizontalDominant && isSwipingLeft
        ? interpolate(
            -translateX.value,
            [0, DEFAULT_GESTURE_CONFIG.horizontalThreshold],
            [0, 0.85],
            Extrapolate.CLAMP,
          )
        : 0;
    return { opacity };
  });

  const skipOverlayStyle = useAnimatedStyle(() => {
    const absX = Math.abs(translateX.value);
    const absY = Math.abs(translateY.value);
    // Only show if vertical is dominant
    const isVerticalDominant = absY > absX;

    const opacity = isVerticalDominant
      ? interpolate(
          absY,
          [0, DEFAULT_GESTURE_CONFIG.verticalThreshold],
          [0, 0.7],
          Extrapolate.CLAMP,
        )
      : 0;
    return { opacity };
  });

  // Render loading state
  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: PASTEL_ORANGE_BG }]}
      >
        <Box twClassName="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary.default} />
          <Text variant={TextVariant.BodyMd} twClassName="mt-4 text-muted">
            Loading markets...
          </Text>
        </Box>
      </SafeAreaView>
    );
  }

  // Render error state
  if (error) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: PASTEL_ORANGE_BG }]}
      >
        <Box twClassName="flex-1 items-center justify-center p-6">
          <Icon
            name={IconName.Warning}
            color={IconColor.ErrorDefault}
            size={IconSize.Xl}
          />
          <Text variant={TextVariant.HeadingMd} twClassName="mt-4 text-center">
            Something went wrong
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            twClassName="mt-2 text-muted text-center"
          >
            {error}
          </Text>
        </Box>
      </SafeAreaView>
    );
  }

  // Render empty state
  if (!hasMoreCards) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: PASTEL_ORANGE_BG }]}
      >
        <Box twClassName="flex-1 items-center justify-center p-6">
          <Text style={{ fontSize: 64 }}>🎉</Text>
          <Text variant={TextVariant.HeadingLg} twClassName="mt-4 text-center">
            All caught up!
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            twClassName="mt-2 text-muted text-center"
          >
            You've seen all trending markets.
          </Text>
          <Box twClassName="mt-8 bg-muted rounded-2xl p-4">
            <Text variant={TextVariant.BodyLg} twClassName="text-center">
              📊 Session Stats
            </Text>
            <Box twClassName="flex-row justify-around mt-3 gap-6">
              <Box twClassName="items-center">
                <Text variant={TextVariant.HeadingMd}>
                  {sessionStats.betsPlaced}
                </Text>
                <Text variant={TextVariant.BodySm} twClassName="text-muted">
                  Bets
                </Text>
              </Box>
              <Box twClassName="items-center">
                <Text variant={TextVariant.HeadingMd}>
                  ${sessionStats.totalWagered.toFixed(0)}
                </Text>
                <Text variant={TextVariant.BodySm} twClassName="text-muted">
                  Wagered
                </Text>
              </Box>
              <Box twClassName="items-center">
                <Text variant={TextVariant.HeadingMd}>
                  {sessionStats.skipped}
                </Text>
                <Text variant={TextVariant.BodySm} twClassName="text-muted">
                  Skipped
                </Text>
              </Box>
            </Box>
          </Box>
          <Pressable
            onPress={handleGoBack}
            style={({ pressed }) => [
              styles.doneButton,
              {
                backgroundColor: colors.primary.default,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text
              variant={TextVariant.BodyLg}
              style={{ color: colors.primary.inverse }}
            >
              Done
            </Text>
          </Pressable>
        </Box>
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaView
        style={[styles.container, { backgroundColor: PASTEL_ORANGE_BG }]}
        testID={SWIPE_GAME_TEST_IDS.CONTAINER}
        edges={['top']}
      >
        {/* ===== HEADER ===== */}
        <View style={styles.header}>
          {/* Left: Back button */}
          <View style={styles.headerLeft}>
            <Pressable
              onPress={handleGoBack}
              hitSlop={20}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.backButtonPressed,
              ]}
            >
              <Icon
                name={IconName.ArrowLeft}
                size={IconSize.Sm}
              />
            </Pressable>
          </View>

          {/* Center: Bet amount pill */}
          <Pressable
            onPress={() => setShowBetSelector(!showBetSelector)}
            testID={SWIPE_GAME_TEST_IDS.BET_AMOUNT_SELECTOR}
            style={({ pressed }) => [
              styles.betCard,
              pressed && styles.betCardPressed,
            ]}
          >
            <Text style={styles.betCardLabel}>Bet</Text>
            <Text style={styles.betCardValue}>${betAmount}</Text>
            <View style={styles.betCardArrow}>
              <Icon
                name={showBetSelector ? IconName.ArrowUp : IconName.ArrowDown}
                size={IconSize.Xs}
              />
            </View>
          </Pressable>

          {/* Right: Balance pill */}
          <View style={styles.headerRight}>
            <View style={styles.balancePill}>
              <Icon
                name={IconName.Wallet}
                size={IconSize.Xs}
              />
              <Text style={styles.balanceText}>${balance.toFixed(0)}</Text>
            </View>
          </View>
        </View>

        {/* ===== BET SELECTOR ===== */}
        {showBetSelector && (
          <View style={styles.betSelectorContainer}>
            <View style={styles.betSelectorInner}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.betSelectorContent}
              >
                {BET_AMOUNTS.map((amount) => {
                  const isSelected = amount === betAmount;
                  const isDisabled = amount > balance;
                  return (
                    <Pressable
                      key={amount}
                      onPress={() => {
                        if (!isDisabled) {
                          setBetAmount(amount);
                          setShowBetSelector(false);
                        }
                      }}
                      disabled={isDisabled}
                      style={({ pressed }) => [
                        styles.betOption,
                        isSelected && styles.betOptionSelected,
                        isDisabled && styles.betOptionDisabled,
                        pressed && !isDisabled && styles.betOptionPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.betOptionValue,
                          isSelected && styles.betOptionValueSelected,
                          isDisabled && styles.betOptionValueDisabled,
                        ]}
                      >
                        ${amount}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        )}

        {/* ===== MAIN CARD AREA ===== */}
        <Box twClassName="flex-1 px-4 justify-center">
          <View style={styles.cardStack}>
            {/* 
              UNIFIED CARD RENDERING
              All cards use same component structure (GestureDetector + Animated.View)
              to prevent unmount/remount when transitioning from background to active.
            */}
            {visibleCards.map((card, index) => {
              const isActive = index === 0;

              // Build overlays for active card only
              const activeOverlay = isActive ? (
                <>
                  {/* YES Overlay (swiping right) */}
                  <Animated.View
                    style={[
                      styles.swipeOverlay,
                      styles.yesOverlayBg,
                      yesOverlayStyle,
                    ]}
                  >
                    <Text
                      variant={TextVariant.HeadingLg}
                      style={styles.overlayText}
                    >
                      YES
                    </Text>
                    <Text
                      variant={TextVariant.BodyLg}
                      style={styles.overlayText}
                    >
                      Bet ${betAmount} → Win ${yesPotentialWin}
                    </Text>
                  </Animated.View>

                  {/* NO Overlay (swiping left) */}
                  <Animated.View
                    style={[
                      styles.swipeOverlay,
                      styles.noOverlayBg,
                      noOverlayStyle,
                    ]}
                  >
                    <Text
                      variant={TextVariant.HeadingLg}
                      style={styles.overlayText}
                    >
                      NO
                    </Text>
                    <Text
                      variant={TextVariant.BodyLg}
                      style={styles.overlayText}
                    >
                      Bet ${betAmount} → Win ${noPotentialWin}
                    </Text>
                  </Animated.View>

                  {/* SKIP Overlay (swiping up/down) */}
                  <Animated.View
                    style={[
                      styles.swipeOverlay,
                      styles.skipOverlayBg,
                      skipOverlayStyle,
                    ]}
                  >
                    <Text
                      variant={TextVariant.HeadingLg}
                      style={styles.overlayText}
                    >
                      SKIP
                    </Text>
                  </Animated.View>

                  {/* Order pending overlay */}
                  {isPendingOrder && (
                    <View
                      style={[styles.swipeOverlay, styles.pendingOverlay]}
                    >
                      <ActivityIndicator
                        size="large"
                        color={colors.primary.default}
                      />
                      <Text
                        variant={TextVariant.BodyMd}
                        twClassName="mt-3"
                      >
                        Placing bet...
                      </Text>
                    </View>
                  )}
                </>
              ) : undefined;

              return (
                <UnifiedStackCard
                  key={card.marketId}
                  card={card}
                  stackIndex={index}
                  isActive={isActive}
                  gesture={gesture}
                  cardAnimatedStyle={cardAnimatedStyle}
                  betAmount={betAmount}
                  preview={currentPreview}
                  onOutcomeChange={selectOutcome}
                  overlay={activeOverlay}
                />
              );
            })}
          </View>
        </Box>

        {/* ===== BOTTOM AREA ===== */}
        <Box
          twClassName="items-center pb-2"
          style={{ paddingBottom: insets.bottom + 8 }}
        >
          {/* Swipe instructions */}
          <Text
            variant={TextVariant.BodyXs}
            twClassName="text-muted opacity-70 mb-2"
          >
            Swipe → for YES, ← for NO, or ↑↓ to skip
          </Text>

          {/* Progress dots */}
          <Box twClassName="flex-row items-center gap-1">
            {Array.from({ length: Math.min(10, cards.length) }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressDot,
                  {
                    backgroundColor:
                      i < currentIndex
                        ? colors.primary.default
                        : i === currentIndex
                          ? colors.text.default
                          : colors.border.muted,
                  },
                ]}
              />
            ))}
            {cards.length > 10 && (
              <Text variant={TextVariant.BodyXs} twClassName="text-muted ml-1">
                +{remainingCards}
              </Text>
            )}
          </Box>
        </Box>

        {/* ===== ORDER ERROR BANNER ===== */}
        {orderError && (
          <Pressable onPress={clearOrderError} style={styles.errorBanner}>
            <Box twClassName="bg-error-muted rounded-2xl px-4 py-3 flex-row items-center mx-4">
              <Icon
                name={IconName.Warning}
                color={IconColor.ErrorDefault}
                size={IconSize.Sm}
              />
              <Text
                variant={TextVariant.BodyMd}
                twClassName="ml-2 flex-1"
                style={{ color: colors.error.default }}
              >
                {orderError}
              </Text>
              <Text variant={TextVariant.BodySm} twClassName="text-muted">
                ✕
              </Text>
            </Box>
          </Pressable>
        )}

        {/* ===== UNDO TOAST ===== */}
        <UndoToast
          isVisible={toastState.isVisible}
          betType={toastState.betType}
          marketTitle={toastState.marketTitle}
          betAmount={toastState.betAmount}
          potentialWin={toastState.potentialWin}
          onUndo={handleToastUndo}
          onDismiss={hideToast}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  // ===== HEADER =====
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  headerLeft: {
    width: 80,
    alignItems: 'flex-start',
  },
  headerRight: {
    width: 80,
    alignItems: 'flex-end',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  backButtonPressed: {
    transform: [{ scale: 0.95 }],
    backgroundColor: 'rgba(255,255,255,1)',
  },
  // Center: Bet card (same height as balance pill)
  betCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 6,
    shadowColor: '#F6851B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(246, 133, 27, 0.12)',
  },
  betCardPressed: {
    transform: [{ scale: 0.97 }],
    shadowOpacity: 0.18,
  },
  betCardLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#F6851B',
    letterSpacing: 0.3,
  },
  betCardValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  betCardArrow: {
    marginLeft: 1,
  },
  // Right: Balance pill
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  balanceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#444',
  },
  // ===== BET SELECTOR =====
  betSelectorContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  betSelectorInner: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 14,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  betSelectorContent: {
    paddingHorizontal: 8,
    gap: 6,
  },
  betOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  betOptionSelected: {
    backgroundColor: '#F6851B',
    borderColor: '#F6851B',
    shadowColor: '#F6851B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  betOptionPressed: {
    transform: [{ scale: 0.95 }],
  },
  betOptionDisabled: {
    opacity: 0.3,
  },
  betOptionValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  betOptionValueSelected: {
    color: '#fff',
  },
  betOptionValueDisabled: {
    color: '#aaa',
  },
  cardStack: {
    flex: 1,
    maxHeight: 500,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  stackedCard: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCard: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yesOverlayBg: {
    backgroundColor: 'rgba(40, 167, 69, 0.92)',
  },
  noOverlayBg: {
    backgroundColor: 'rgba(215, 58, 73, 0.92)',
  },
  skipOverlayBg: {
    backgroundColor: 'rgba(100, 100, 100, 0.88)',
  },
  pendingOverlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  overlayText: {
    color: 'white',
    textAlign: 'center',
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  errorBanner: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    zIndex: 50,
  },
  doneButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
  },
});

export default PredictSwipeGame;
