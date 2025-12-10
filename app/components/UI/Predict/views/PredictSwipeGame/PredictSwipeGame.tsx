import React, { useCallback, useMemo, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  ActivityIndicator,
  Pressable,
  Dimensions,
  Image,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import {
  GestureDetector,
  GestureHandlerRootView,
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

  // Animated overlay styles based on swipe direction
  const yesOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, DEFAULT_GESTURE_CONFIG.horizontalThreshold],
      [0, 0.85],
      Extrapolate.CLAMP,
    );
    return { opacity };
  });

  const noOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-DEFAULT_GESTURE_CONFIG.horizontalThreshold, 0],
      [0.85, 0],
      Extrapolate.CLAMP,
    );
    return { opacity };
  });

  const skipOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      Math.abs(translateY.value),
      [0, DEFAULT_GESTURE_CONFIG.verticalThreshold],
      [0, 0.7],
      Extrapolate.CLAMP,
    );
    return { opacity };
  });

  // Render loading state
  if (isLoading) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: colors.background.default },
        ]}
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
        style={[
          styles.container,
          { backgroundColor: colors.background.default },
        ]}
      >
        <Box twClassName="flex-1 items-center justify-center p-6">
          <Icon
            name={IconName.Warning}
            color={IconColor.Error}
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
        style={[
          styles.container,
          { backgroundColor: colors.background.default },
        ]}
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
        style={[
          styles.container,
          { backgroundColor: colors.background.default },
        ]}
        testID={SWIPE_GAME_TEST_IDS.CONTAINER}
        edges={['top']}
      >
        {/* ===== MINIMAL HEADER ===== */}
        <Box twClassName="flex-row items-center justify-between px-4 py-3">
          {/* Back button */}
          <Pressable
            onPress={handleGoBack}
            hitSlop={20}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Icon
              name={IconName.ArrowLeft}
              color={IconColor.Default}
              size={IconSize.Md}
            />
          </Pressable>

          {/* Bet amount chip */}
          <Pressable
            onPress={() => setShowBetSelector(!showBetSelector)}
            testID={SWIPE_GAME_TEST_IDS.BET_AMOUNT_SELECTOR}
            style={({ pressed }) => [
              styles.betChip,
              {
                backgroundColor: colors.background.alternative,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text variant={TextVariant.BodyMdBold}>${betAmount}</Text>
            <Icon
              name={IconName.ArrowDown}
              color={IconColor.Default}
              size={IconSize.Xs}
            />
          </Pressable>

          {/* Balance indicator */}
          <Box twClassName="flex-row items-center">
            <Text variant={TextVariant.BodySm} twClassName="text-muted">
              💰 ${balance.toFixed(0)}
            </Text>
          </Box>
        </Box>

        {/* ===== BET AMOUNT QUICK SELECTOR ===== */}
        {showBetSelector && (
          <Box twClassName="px-4 pb-3">
            <Box twClassName="flex-row justify-center gap-2 flex-wrap">
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
                    style={[
                      styles.betPreset,
                      isSelected && { backgroundColor: colors.primary.default },
                      !isSelected && {
                        backgroundColor: colors.background.alternative,
                      },
                      isDisabled && { opacity: 0.4 },
                    ]}
                  >
                    <Text
                      variant={TextVariant.BodyMd}
                      fontWeight={
                        isSelected ? FontWeight.Bold : FontWeight.Medium
                      }
                      style={
                        isSelected
                          ? { color: colors.primary.inverse }
                          : undefined
                      }
                    >
                      ${amount}
                    </Text>
                  </Pressable>
                );
              })}
            </Box>
          </Box>
        )}

        {/* ===== MAIN CARD AREA ===== */}
        <Box twClassName="flex-1 px-4 justify-center">
          <View style={styles.cardStack}>
            {/* Background cards (stacked) */}
            {visibleCards
              .slice(1)
              .reverse()
              .map((card, reversedIndex) => {
                const stackIndex = visibleCards.length - 1 - reversedIndex;
                const scale =
                  1 - stackIndex * CARD_ANIMATION.STACK_SCALE_DECREASE;
                const offsetY = stackIndex * CARD_ANIMATION.STACK_OFFSET_Y;
                const cardOpacity =
                  1 - stackIndex * CARD_ANIMATION.STACK_OPACITY_DECREASE;

                return (
                  <View
                    key={card.marketId}
                    style={[
                      styles.stackedCard,
                      {
                        transform: [{ scale }, { translateY: offsetY }],
                        opacity: cardOpacity,
                        zIndex: VISIBLE_STACK_COUNT - stackIndex,
                      },
                    ]}
                  >
                    <SwipeCard
                      card={card}
                      preview={null}
                      betAmount={betAmount}
                      isActive={false}
                    />
                  </View>
                );
              })}

            {/* Active card (swipeable) */}
            {currentCard && (
              <GestureDetector gesture={gesture}>
                <Animated.View
                  key={currentCard.marketId}
                  style={[
                    styles.activeCard,
                    cardAnimatedStyle,
                    { zIndex: VISIBLE_STACK_COUNT + 1 },
                  ]}
                >
                  <SwipeCard
                    card={currentCard}
                    preview={currentPreview}
                    betAmount={betAmount}
                    isActive
                  />

                  {/* ===== SWIPE OVERLAYS ===== */}
                  {/* YES Overlay (swiping right) */}
                  <Animated.View style={[styles.swipeOverlay, yesOverlayStyle]}>
                    <Box
                      twClassName="flex-1 items-center justify-center rounded-3xl"
                      style={{ backgroundColor: 'rgba(40, 167, 69, 0.9)' }}
                    >
                      <Text style={styles.overlayIcon}>✓</Text>
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
                    </Box>
                  </Animated.View>

                  {/* NO Overlay (swiping left) */}
                  <Animated.View style={[styles.swipeOverlay, noOverlayStyle]}>
                    <Box
                      twClassName="flex-1 items-center justify-center rounded-3xl"
                      style={{ backgroundColor: 'rgba(215, 58, 73, 0.9)' }}
                    >
                      <Text style={styles.overlayIcon}>✗</Text>
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
                    </Box>
                  </Animated.View>

                  {/* SKIP Overlay (swiping up/down) */}
                  <Animated.View
                    style={[styles.swipeOverlay, skipOverlayStyle]}
                  >
                    <Box
                      twClassName="flex-1 items-center justify-center rounded-3xl"
                      style={{ backgroundColor: 'rgba(100, 100, 100, 0.85)' }}
                    >
                      <Text style={styles.overlayIcon}>↕</Text>
                      <Text
                        variant={TextVariant.HeadingLg}
                        style={styles.overlayText}
                      >
                        SKIP
                      </Text>
                    </Box>
                  </Animated.View>

                  {/* Order pending overlay */}
                  {isPendingOrder && (
                    <Box
                      twClassName="absolute inset-0 items-center justify-center rounded-3xl"
                      style={{ backgroundColor: 'rgba(255,255,255,0.8)' }}
                    >
                      <ActivityIndicator
                        size="large"
                        color={colors.primary.default}
                      />
                      <Text variant={TextVariant.BodyMd} twClassName="mt-3">
                        Placing bet...
                      </Text>
                    </Box>
                  )}
                </Animated.View>
              </GestureDetector>
            )}
          </View>
        </Box>

        {/* ===== BOTTOM AREA ===== */}
        <Box
          twClassName="items-center pb-2"
          style={{ paddingBottom: insets.bottom + 8 }}
        >
          {/* Skip hint */}
          <Text
            variant={TextVariant.BodySm}
            twClassName="text-muted opacity-60 mb-2"
          >
            ↕ Swipe up or down to skip
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
                color={IconColor.Error}
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
  betChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  betPreset: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
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
    overflow: 'hidden',
  },
  overlayIcon: {
    fontSize: 64,
    color: 'white',
    marginBottom: 8,
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
