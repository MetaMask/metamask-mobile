# Predict Swipe Game - Implementation Plan

## Overview

A Tinder-style swipe game for prediction markets where users can quickly bet on trending markets:

- **Swipe Right** → Bet on "Yes" ✅ (positive action = right)
- **Swipe Left** → Bet on "No" ❌ (negative action = left)
- **Swipe Down** → Skip to next card ⏭️

## Key Decisions (Resolved)

| Question                | Decision                                                      |
| ----------------------- | ------------------------------------------------------------- |
| Swipe direction         | Right = Yes, Left = No (intuitive mapping)                    |
| Confirmation before bet | No - instant bet, but with 5s undo window                     |
| Undo feature            | Yes - 5 second undo button (uses existing rate limit)         |
| Multi-outcome markets   | Show highest volume as primary, others selectable inside card |
| Onboarding              | Not needed for MVP                                            |
| Sound/Haptics           | Yes - sound effects + vibration feedback                      |

## Table of Contents

1. [Feature Architecture](#1-feature-architecture)
2. [Data Layer](#2-data-layer)
3. [UI Components](#3-ui-components)
4. [Gesture & Animation System](#4-gesture--animation-system)
5. [Betting Flow](#5-betting-flow)
6. [State Management](#6-state-management)
7. [Navigation & Integration](#7-navigation--integration)
8. [Analytics](#8-analytics)
9. [Error Handling](#9-error-handling)
10. [Testing Strategy](#10-testing-strategy)
11. [Implementation Phases](#11-implementation-phases)
12. [Open Questions](#12-open-questions)

---

## 1. Feature Architecture

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PredictSwipeGame (View)                   │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   BetAmount     │  │   SwipeCard     │  │  CardStack  │ │
│  │   Selector      │  │   Component     │  │  Manager    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                         Hooks Layer                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ useSwipeGame    │  │ useCardPreviews │  │ useSwipe    │ │
│  │ (orchestrator)  │  │ (price data)    │  │ Gesture     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
├─────────────────────────────────────────────────────────────┤
│              Existing Predict Infrastructure                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ usePredictOrder │  │ usePredictPlace │  │ usePredictM │ │
│  │ Preview         │  │ Order           │  │ arketData   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    PredictController                         │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 File Structure

```
/Predict/views/PredictSwipeGame/
├── PredictSwipeGame.tsx              # Main view component
├── PredictSwipeGame.types.ts         # TypeScript types
├── PredictSwipeGame.constants.ts     # Constants (default bet, thresholds)
├── index.ts                          # Barrel export
│
├── /components/
│   ├── SwipeCard/
│   │   ├── SwipeCard.tsx             # Main swipeable card
│   │   ├── SwipeCard.styles.ts       # Tailwind styles
│   │   ├── SwipeCard.types.ts
│   │   └── index.ts
│   │
│   ├── CardStack/
│   │   ├── CardStack.tsx             # Manages stack of cards
│   │   └── index.ts
│   │
│   ├── BetAmountSelector/
│   │   ├── BetAmountSelector.tsx     # Top bar bet amount
│   │   └── index.ts
│   │
│   ├── SwipeIndicator/
│   │   ├── SwipeIndicator.tsx        # Yes/No/Skip indicators
│   │   └── index.ts
│   │
│   ├── OutcomeSelector/
│   │   ├── OutcomeSelector.tsx       # For multi-outcome markets
│   │   └── index.ts
│   │
│   ├── SwipeOverlay/
│   │   ├── SwipeOverlay.tsx          # Overlay shown during swipe
│   │   └── index.ts
│   │
│   ├── UndoToast/
│   │   ├── UndoToast.tsx             # Toast with undo button & countdown
│   │   ├── UndoToast.types.ts
│   │   └── index.ts
│   │
│   └── CircularProgress/
│       ├── CircularProgress.tsx      # Animated circular countdown
│       └── index.ts
│
├── /hooks/
│   ├── useSwipeGame.ts               # Main game orchestrator
│   ├── useCardPreviews.ts            # Manages order previews for visible cards
│   ├── useSwipeGesture.ts            # Gesture detection & animation
│   ├── useSwipeAnalytics.ts          # Game session analytics
│   ├── useUndoToast.ts               # Toast-based undo with countdown
│   └── useSwipeFeedback.ts           # Sound & haptic feedback
│
├── /utils/
│   ├── marketSorting.ts              # Sort outcomes by volume
│   ├── cardTransforms.ts             # Animation calculations
│   └── sounds.ts                     # Audio player singleton
│
└── /assets/
    └── /sounds/
        ├── swipe-yes.mp3             # Success sound
        ├── swipe-no.mp3              # Bet placed sound
        ├── skip.mp3                  # Skip sound
        ├── undo.mp3                  # Undo sound
        ├── error.mp3                 # Error sound
        └── card-appear.mp3           # New card animation
```

---

## 2. Data Layer

### 2.1 Market Data Fetching

**Source**: Use existing `usePredictMarketData` hook with `category: 'trending'`

```typescript
// Fetch trending markets
const { markets, isLoading, fetchMore } = usePredictMarketData({
  category: 'trending',
  limit: 20,
});
```

### 2.2 Market Transformation for Swipe Game

Each market needs to be transformed into a "SwipeCard" format:

```typescript
interface SwipeGameCard {
  // Market identification
  marketId: string;
  providerId: string;

  // Display info
  title: string;
  description: string;
  image: string;
  endDate?: string;

  // Primary bet (highest volume outcome for multi-outcome markets)
  primaryOutcome: {
    outcomeId: string;
    yesToken: OutcomeToken; // Token for "Yes" bet
    noToken: OutcomeToken; // Token for "No" bet
    title: string; // e.g., "Will Bitcoin hit $100k?"
  };

  // Alternative outcomes (for multi-outcome markets, sorted by volume)
  alternativeOutcomes: Array<{
    outcomeId: string;
    title: string;
    volume: number;
    yesToken: OutcomeToken;
    noToken: OutcomeToken;
  }>;

  // Metadata
  totalVolume: number;
  liquidity: number;
  isMultiOutcome: boolean;
}

interface OutcomeToken {
  id: string; // CLOB token ID needed for trading
  title: string; // "Yes" or "No"
  price: number; // Current price (0-1)
}
```

### 2.3 Outcome Sorting Logic

For markets with multiple outcomes, sort by volume and select primary:

```typescript
function transformMarketToCard(market: PredictMarket): SwipeGameCard {
  // Sort outcomes by volume (highest first)
  const sortedOutcomes = [...market.outcomes].sort(
    (a, b) => b.volume - a.volume,
  );

  const primaryOutcome = sortedOutcomes[0];
  const alternativeOutcomes = sortedOutcomes.slice(1);

  // Find Yes and No tokens for each outcome
  // In Polymarket: tokens[0] = Yes, tokens[1] = No (typically)
  const yesToken =
    primaryOutcome.tokens.find((t) => t.title.toLowerCase() === 'yes') ||
    primaryOutcome.tokens[0];

  const noToken =
    primaryOutcome.tokens.find((t) => t.title.toLowerCase() === 'no') ||
    primaryOutcome.tokens[1];

  return {
    marketId: market.id,
    providerId: market.providerId,
    title: market.title,
    description: market.description,
    image: market.image,
    endDate: market.endDate,
    primaryOutcome: {
      outcomeId: primaryOutcome.id,
      yesToken: {
        id: yesToken.id,
        title: yesToken.title,
        price: yesToken.price,
      },
      noToken: { id: noToken.id, title: noToken.title, price: noToken.price },
      title: primaryOutcome.title,
    },
    alternativeOutcomes: alternativeOutcomes.map((outcome) => ({
      outcomeId: outcome.id,
      title: outcome.title,
      volume: outcome.volume,
      yesToken: outcome.tokens[0],
      noToken: outcome.tokens[1],
    })),
    totalVolume: market.volume,
    liquidity: market.liquidity,
    isMultiOutcome: market.outcomes.length > 1,
  };
}
```

### 2.4 Price Preview Prefetching

For smooth UX, prefetch order previews for visible cards:

```typescript
interface CardPreview {
  cardId: string;
  betAmount: number;

  // Yes bet preview
  yesPreview: {
    sharePrice: number;
    estimatedShares: number;
    potentialWin: number; // If outcome is Yes
    odds: string; // e.g., "2.5x"
  } | null;

  // No bet preview
  noPreview: {
    sharePrice: number;
    estimatedShares: number;
    potentialWin: number;
    odds: string;
  } | null;

  isLoading: boolean;
  error: string | null;
}
```

**Prefetch Strategy**:

- Always have preview for current card
- Prefetch next 2 cards in background
- Re-fetch when bet amount changes
- Cache previews for recently viewed cards

```typescript
function useCardPreviews(
  cards: SwipeGameCard[],
  currentIndex: number,
  betAmount: number,
) {
  const [previews, setPreviews] = useState<Map<string, CardPreview>>();

  useEffect(() => {
    // Fetch previews for current + next 2 cards
    const cardsToPreview = cards.slice(currentIndex, currentIndex + 3);

    cardsToPreview.forEach(async (card) => {
      // Fetch YES preview
      const yesPreview = await previewOrder({
        providerId: card.providerId,
        marketId: card.marketId,
        outcomeId: card.primaryOutcome.outcomeId,
        outcomeTokenId: card.primaryOutcome.yesToken.id,
        side: Side.BUY,
        size: betAmount,
      });

      // Fetch NO preview
      const noPreview = await previewOrder({
        providerId: card.providerId,
        marketId: card.marketId,
        outcomeId: card.primaryOutcome.outcomeId,
        outcomeTokenId: card.primaryOutcome.noToken.id,
        side: Side.BUY,
        size: betAmount,
      });

      // Calculate potential winnings
      // Win = shares received (each share pays $1 if correct)
      // So potential win = minAmountReceived - betAmount
      setPreviews((prev) =>
        prev.set(card.marketId, {
          yesPreview: {
            sharePrice: yesPreview.sharePrice,
            estimatedShares: yesPreview.minAmountReceived,
            potentialWin: yesPreview.minAmountReceived - betAmount,
            odds: `${(1 / yesPreview.sharePrice).toFixed(1)}x`,
          },
          noPreview: {
            sharePrice: noPreview.sharePrice,
            estimatedShares: noPreview.minAmountReceived,
            potentialWin: noPreview.minAmountReceived - betAmount,
            odds: `${(1 / noPreview.sharePrice).toFixed(1)}x`,
          },
          isLoading: false,
          error: null,
        }),
      );
    });
  }, [cards, currentIndex, betAmount]);

  return previews;
}
```

---

## 3. UI Components

### 3.1 Main Layout

**Normal State** (swiping cards):

```
┌────────────────────────────────────┐
│  ┌──────────────────────────────┐  │  ← Header with back button
│  │  💰 $5.00  ▼                 │  │  ← Bet amount selector
│  └──────────────────────────────┘  │
│                                    │
│                                    │
│  ┌────┐   ┌──────────────┐ ┌────┐  │
│  │ NO │   │              │ │YES │  │  ← Swipe LEFT for NO
│  │ ❌ │   │   MARKET     │ │ ✅ │  │  ← Swipe RIGHT for YES
│  │65¢ │   │    CARD      │ │35¢ │  │
│  │    │   │  〰️ levitate │ │    │  │
│  │win │   │              │ │win │  │
│  │$X  │   │              │ │$X  │  │
│  └────┘   └──────────────┘ └────┘  │
│                                    │
│           ┌──────────┐             │
│           │   SKIP   │             │  ← Swipe DOWN to skip
│           │    ↓     │             │
│           └──────────┘             │
│                                    │
│  ┌──────────────────────────────┐  │
│  │  Cards remaining: 15         │  │  ← Progress indicator
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

**After Bet** (undo toast appears for 5 seconds):

```
┌────────────────────────────────────┐
│  💰 $5.00  ▼                       │
│                                    │
│  ┌────┐   ┌──────────────┐ ┌────┐  │
│  │ NO │   │  NEXT CARD   │ │YES │  │
│  └────┘   └──────────────┘ └────┘  │
│                                    │
│  ┌──────────────────────────────┐  │
│  │ ✅ YES bet placed!           │  │  ← Undo Toast
│  │ "Will BTC hit $100k?"        │  │
│  │ $5.00 → Win $8.50        ⟲   │  │  ← Circular countdown
│  │                          ↺   │  │  ← Tap to Undo
│  └──────────────────────────────┘  │
│                                    │
│           ┌──────────┐             │
│           │   SKIP ↓ │             │
│           └──────────┘             │
└────────────────────────────────────┘
```

**Swipe Directions Summary**:
| Gesture | Action | Color | Meaning |
|---------|--------|-------|---------|
| → Swipe RIGHT | YES bet | 🟢 Green | Positive/accept |
| ← Swipe LEFT | NO bet | 🔴 Red | Negative/reject |
| ↓ Swipe DOWN | Skip | ⚪ Gray | Neutral/pass |

### 3.2 SwipeCard Component

**Design Requirements**:

- Rounded corners with shadow
- Market image as background or header
- Title prominently displayed
- Levitating animation (subtle up/down oscillation)
- For multi-outcome: collapsible outcome selector inside

```typescript
interface SwipeCardProps {
  card: SwipeGameCard;
  preview: CardPreview;
  betAmount: number;
  onOutcomeChange: (outcomeId: string) => void;
  isActive: boolean;  // Only active card is swipeable
  style: ViewStyle;   // Animated style from gesture
}

const SwipeCard: React.FC<SwipeCardProps> = ({
  card,
  preview,
  betAmount,
  onOutcomeChange,
  isActive,
  style,
}) => {
  const tw = useTailwind();

  // Levitating animation
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      translateY.value = withRepeat(
        withSequence(
          withTiming(-8, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        ),
        -1, // Infinite
        true, // Reverse
      );
    }
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>
      <Box twClassName="bg-default rounded-3xl overflow-hidden shadow-lg">
        {/* Card Image */}
        <Image source={{ uri: card.image }} twClassName="w-full h-40" />

        {/* Card Content */}
        <Box twClassName="p-4">
          <Text variant={TextVariant.HeadingMd}>{card.title}</Text>

          {card.isMultiOutcome && (
            <OutcomeSelector
              outcomes={[card.primaryOutcome, ...card.alternativeOutcomes]}
              selectedOutcomeId={card.primaryOutcome.outcomeId}
              onSelect={onOutcomeChange}
            />
          )}

          <Text variant={TextVariant.BodySm} twClassName="text-muted mt-2">
            {card.endDate ? `Ends ${formatDate(card.endDate)}` : ''}
          </Text>
        </Box>
      </Box>
    </Animated.View>
  );
};
```

### 3.3 SwipeIndicator Component

Shows Yes/No options on sides of card:

```typescript
interface SwipeIndicatorProps {
  side: 'yes' | 'no' | 'skip';
  price: number;        // Current price (e.g., 0.35)
  potentialWin: number; // Potential profit
  isHighlighted: boolean; // Highlight when swiping toward it
}

const SwipeIndicator: React.FC<SwipeIndicatorProps> = ({
  side,
  price,
  potentialWin,
  isHighlighted,
}) => {
  const tw = useTailwind();

  const getConfig = () => {
    switch (side) {
      case 'yes':
        return {
          label: 'YES',
          color: 'bg-success-default',
          icon: IconName.CheckCircle,
        };
      case 'no':
        return {
          label: 'NO',
          color: 'bg-error-default',
          icon: IconName.CloseCircle,
        };
      case 'skip':
        return {
          label: 'SKIP',
          color: 'bg-muted',
          icon: IconName.ArrowDown,
        };
    }
  };

  const config = getConfig();
  const odds = `${Math.round(price * 100)}¢`;
  const winFormatted = formatPrice(potentialWin, { prefix: '+$' });

  return (
    <Animated.View
      style={[
        tw.style(
          'rounded-2xl p-4 items-center justify-center',
          isHighlighted && 'scale-110',
        ),
      ]}
    >
      <Box twClassName={`${config.color} rounded-full p-3 mb-2`}>
        <Icon name={config.icon} color={IconColor.OnPrimary} size={32} />
      </Box>
      <Text variant={TextVariant.HeadingLg} twClassName="font-bold">
        {config.label}
      </Text>
      <Text variant={TextVariant.HeadingMd} twClassName="mt-1">
        {odds}
      </Text>
      {side !== 'skip' && (
        <Text variant={TextVariant.BodyMd} twClassName="text-success-default mt-1">
          Win {winFormatted}
        </Text>
      )}
    </Animated.View>
  );
};
```

### 3.4 BetAmountSelector Component

```typescript
const DEFAULT_BET_AMOUNTS = [1, 5, 10, 25, 50, 100];

interface BetAmountSelectorProps {
  value: number;
  onChange: (amount: number) => void;
  maxBalance: number;
}

const BetAmountSelector: React.FC<BetAmountSelectorProps> = ({
  value,
  onChange,
  maxBalance,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Box twClassName="flex-row items-center justify-center py-4">
      <Pressable
        onPress={() => setIsOpen(true)}
        style={({ pressed }) => tw.style(
          'flex-row items-center bg-muted rounded-full px-6 py-3',
          pressed && 'opacity-80',
        )}
      >
        <Icon name={IconName.Coin} size={24} />
        <Text variant={TextVariant.HeadingMd} twClassName="ml-2">
          ${value.toFixed(2)}
        </Text>
        <Icon name={IconName.ChevronDown} size={20} twClassName="ml-1" />
      </Pressable>

      {/* Bottom sheet for amount selection */}
      <BottomSheet isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <Box twClassName="p-4">
          <Text variant={TextVariant.HeadingMd}>Select bet amount</Text>
          <Box twClassName="flex-row flex-wrap gap-2 mt-4">
            {DEFAULT_BET_AMOUNTS.filter(a => a <= maxBalance).map(amount => (
              <Pressable
                key={amount}
                onPress={() => { onChange(amount); setIsOpen(false); }}
                twClassName={`px-6 py-3 rounded-full ${
                  value === amount ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <Text>${amount}</Text>
              </Pressable>
            ))}
          </Box>

          {/* Custom amount input */}
          <TextInput
            label="Custom amount"
            keyboardType="decimal-pad"
            prefix="$"
            maxValue={maxBalance}
            onSubmit={(v) => { onChange(parseFloat(v)); setIsOpen(false); }}
          />
        </Box>
      </BottomSheet>
    </Box>
  );
};
```

### 3.5 OutcomeSelector Component (for multi-outcome markets)

```typescript
interface OutcomeSelectorProps {
  outcomes: Array<{
    outcomeId: string;
    title: string;
    volume: number;
  }>;
  selectedOutcomeId: string;
  onSelect: (outcomeId: string) => void;
}

const OutcomeSelector: React.FC<OutcomeSelectorProps> = ({
  outcomes,
  selectedOutcomeId,
  onSelect,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const selectedOutcome = outcomes.find(o => o.outcomeId === selectedOutcomeId);
  const otherOutcomes = outcomes.filter(o => o.outcomeId !== selectedOutcomeId);

  return (
    <Box twClassName="mt-3">
      {/* Selected outcome display */}
      <Pressable
        onPress={() => setIsExpanded(!isExpanded)}
        twClassName="flex-row items-center justify-between bg-muted rounded-xl p-3"
      >
        <Text variant={TextVariant.BodyMd}>
          Betting on: {selectedOutcome?.title}
        </Text>
        {otherOutcomes.length > 0 && (
          <Box twClassName="flex-row items-center">
            <Text variant={TextVariant.BodySm} twClassName="text-muted mr-1">
              {otherOutcomes.length} more
            </Text>
            <Icon
              name={isExpanded ? IconName.ChevronUp : IconName.ChevronDown}
              size={16}
            />
          </Box>
        )}
      </Pressable>

      {/* Expandable list of other outcomes */}
      {isExpanded && (
        <Box twClassName="mt-2 gap-2">
          {otherOutcomes.map(outcome => (
            <Pressable
              key={outcome.outcomeId}
              onPress={() => {
                onSelect(outcome.outcomeId);
                setIsExpanded(false);
              }}
              twClassName="bg-muted-alt rounded-xl p-3 flex-row justify-between"
            >
              <Text variant={TextVariant.BodyMd}>{outcome.title}</Text>
              <Text variant={TextVariant.BodySm} twClassName="text-muted">
                Vol: {formatVolume(outcome.volume)}
              </Text>
            </Pressable>
          ))}
        </Box>
      )}
    </Box>
  );
};
```

---

## 4. Gesture & Animation System

### 4.1 Swipe Gesture Handler

Using `react-native-gesture-handler` and `react-native-reanimated`:

```typescript
interface SwipeGestureConfig {
  horizontalThreshold: number; // Min X distance to trigger action (e.g., 100)
  verticalThreshold: number; // Min Y distance for skip (e.g., 80)
  snapBackDuration: number; // Animation duration for snap back (ms)
  exitDuration: number; // Animation duration for exit (ms)
}

const DEFAULT_CONFIG: SwipeGestureConfig = {
  horizontalThreshold: 100,
  verticalThreshold: 80,
  snapBackDuration: 300,
  exitDuration: 250,
};

function useSwipeGesture(
  onSwipeLeft: () => void,
  onSwipeRight: () => void,
  onSwipeDown: () => void,
  config: SwipeGestureConfig = DEFAULT_CONFIG,
) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  // Derived values for indicator highlighting
  const isSwipingLeft = useDerivedValue(() => translateX.value < -30);
  const isSwipingRight = useDerivedValue(() => translateX.value > 30);
  const isSwipingDown = useDerivedValue(
    () => translateY.value > 30 && Math.abs(translateX.value) < 30,
  );

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = Math.max(0, event.translationY); // Only allow down

      // Rotate slightly based on horizontal movement
      rotation.value = (event.translationX / SCREEN_WIDTH) * 15; // Max 15 degrees

      // Scale down slightly when swiping
      scale.value =
        1 - Math.min(Math.abs(event.translationX) / SCREEN_WIDTH, 0.1);
    })
    .onEnd((event) => {
      const { translationX, translationY, velocityX, velocityY } = event;

      // Check for swipe RIGHT (YES bet) ✅
      if (translationX > config.horizontalThreshold || velocityX > 500) {
        // Animate out to right
        translateX.value = withTiming(SCREEN_WIDTH * 1.5, {
          duration: config.exitDuration,
        });
        opacity.value = withTiming(0, { duration: config.exitDuration });
        runOnJS(onSwipeRight)(); // YES bet
        return;
      }

      // Check for swipe LEFT (NO bet) ❌
      if (translationX < -config.horizontalThreshold || velocityX < -500) {
        // Animate out to left
        translateX.value = withTiming(-SCREEN_WIDTH * 1.5, {
          duration: config.exitDuration,
        });
        opacity.value = withTiming(0, { duration: config.exitDuration });
        runOnJS(onSwipeLeft)(); // NO bet
        return;
      }

      // Check for swipe down (Skip) ⏭️
      if (
        translationY > config.verticalThreshold &&
        Math.abs(translationX) < 50
      ) {
        // Animate out to bottom
        translateY.value = withTiming(SCREEN_HEIGHT, {
          duration: config.exitDuration,
        });
        opacity.value = withTiming(0, { duration: config.exitDuration });
        runOnJS(onSwipeDown)();
        return;
      }

      // Snap back to center
      translateX.value = withSpring(0, { damping: 15 });
      translateY.value = withSpring(0, { damping: 15 });
      rotation.value = withSpring(0, { damping: 15 });
      scale.value = withSpring(1, { damping: 15 });
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  const resetCard = () => {
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    rotation.value = withSpring(0);
    scale.value = withSpring(1);
    opacity.value = 1;
  };

  return {
    gesture,
    cardStyle,
    isSwipingLeft,
    isSwipingRight,
    isSwipingDown,
    resetCard,
  };
}
```

### 4.2 Card Stack Animation

Show next card behind current card with slight offset:

```typescript
function CardStack({
  cards,
  currentIndex,
  ...props
}: CardStackProps) {
  // Show current card + 2 behind it
  const visibleCards = cards.slice(currentIndex, currentIndex + 3);

  return (
    <Box twClassName="flex-1 items-center justify-center">
      {visibleCards.map((card, stackIndex) => {
        const isActive = stackIndex === 0;

        // Cards behind are smaller and offset
        const scale = 1 - (stackIndex * 0.05);
        const translateY = stackIndex * 10;
        const zIndex = 3 - stackIndex;

        return (
          <SwipeCard
            key={card.marketId}
            card={card}
            isActive={isActive}
            style={{
              position: 'absolute',
              transform: [
                { scale },
                { translateY },
              ],
              zIndex,
              opacity: 1 - (stackIndex * 0.2),
            }}
            {...props}
          />
        );
      })}
    </Box>
  );
}
```

### 4.3 Swipe Overlay Feedback

Visual feedback during swipe:

```typescript
const SwipeOverlay: React.FC<{
  isSwipingLeft: SharedValue<boolean>;
  isSwipingRight: SharedValue<boolean>;
  isSwipingDown: SharedValue<boolean>;
}> = ({ isSwipingLeft, isSwipingRight, isSwipingDown }) => {

  const yesOverlayStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isSwipingLeft.value ? 0.9 : 0, { duration: 150 }),
    transform: [{ scale: withSpring(isSwipingLeft.value ? 1 : 0.8) }],
  }));

  const noOverlayStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isSwipingRight.value ? 0.9 : 0, { duration: 150 }),
    transform: [{ scale: withSpring(isSwipingRight.value ? 1 : 0.8) }],
  }));

  const skipOverlayStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isSwipingDown.value ? 0.9 : 0, { duration: 150 }),
  }));

  return (
    <>
      {/* YES overlay (left swipe) */}
      <Animated.View
        style={[styles.overlay, styles.leftOverlay, yesOverlayStyle]}
        pointerEvents="none"
      >
        <Box twClassName="bg-success-default rounded-xl p-4">
          <Text variant={TextVariant.HeadingLg} twClassName="text-on-primary">
            YES! 🎯
          </Text>
        </Box>
      </Animated.View>

      {/* NO overlay (right swipe) */}
      <Animated.View
        style={[styles.overlay, styles.rightOverlay, noOverlayStyle]}
        pointerEvents="none"
      >
        <Box twClassName="bg-error-default rounded-xl p-4">
          <Text variant={TextVariant.HeadingLg} twClassName="text-on-primary">
            NO! ❌
          </Text>
        </Box>
      </Animated.View>

      {/* SKIP overlay (down swipe) */}
      <Animated.View
        style={[styles.overlay, styles.bottomOverlay, skipOverlayStyle]}
        pointerEvents="none"
      >
        <Box twClassName="bg-muted rounded-xl p-4">
          <Text variant={TextVariant.HeadingLg}>
            SKIP ⏭️
          </Text>
        </Box>
      </Animated.View>
    </>
  );
};
```

---

## 5. Betting Flow

### 5.1 Order Placement on Swipe

When a swipe action is confirmed:

```typescript
async function placeBetOnSwipe(
  card: SwipeGameCard,
  preview: OrderPreview,
  side: 'yes' | 'no',
  betAmount: number,
): Promise<BetResult> {
  const token =
    side === 'yes' ? card.primaryOutcome.yesToken : card.primaryOutcome.noToken;

  try {
    const result = await placeOrder({
      providerId: card.providerId,
      preview: {
        ...preview,
        side: Side.BUY,
        marketId: card.marketId,
        outcomeId: card.primaryOutcome.outcomeId,
        outcomeTokenId: token.id,
      },
      analyticsProperties: {
        marketId: card.marketId,
        marketTitle: card.title,
        entryPoint: 'swipe_game',
        transactionType: 'buy',
      },
    });

    return {
      success: true,
      orderId: result.response?.id,
      sharesReceived: result.response?.receivedAmount,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Order failed',
    };
  }
}
```

### 5.2 Undo Feature (Toast-Based)

The undo button appears **inside the confirmation toast** that shows after a bet is placed. The toast lasts 5 seconds (matching the rate limit) with a circular countdown indicator.

```typescript
interface UndoToastState {
  isVisible: boolean;
  betType: 'yes' | 'no';
  marketTitle: string;
  betAmount: number;
  potentialWin: number;
  startTime: number;
}

const UNDO_WINDOW_MS = 5000;
```

**Custom Undo Toast Component**:

```typescript
interface UndoToastProps {
  betType: 'yes' | 'no';
  marketTitle: string;
  betAmount: number;
  potentialWin: number;
  onUndo: () => void;
  onDismiss: () => void;
  duration?: number;  // Default 5000ms
}

const UndoToast: React.FC<UndoToastProps> = ({
  betType,
  marketTitle,
  betAmount,
  potentialWin,
  onUndo,
  onDismiss,
  duration = UNDO_WINDOW_MS,
}) => {
  const tw = useTailwind();
  const progress = useSharedValue(1);  // 1 = full, 0 = empty
  const opacity = useSharedValue(0);

  // Animate in
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 200 });

    // Countdown animation (1 → 0 over duration)
    progress.value = withTiming(0, {
      duration,
      easing: Easing.linear,
    });

    // Auto-dismiss after duration
    const timer = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 200 });
      setTimeout(onDismiss, 200);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: interpolate(opacity.value, [0, 1], [50, 0]) },
    ],
  }));

  const handleUndo = () => {
    triggerHaptic('undo');
    swipeGameAudio.playSound('undo');
    onUndo();
  };

  const isYes = betType === 'yes';
  const bgColor = isYes ? 'bg-success-muted' : 'bg-error-muted';
  const iconColor = isYes ? IconColor.Success : IconColor.Error;
  const icon = isYes ? IconName.CheckCircle : IconName.CloseCircle;

  return (
    <Animated.View style={[styles.toastContainer, containerStyle]}>
      <Box twClassName={`${bgColor} rounded-2xl p-4 mx-4 shadow-lg`}>
        {/* Toast Content */}
        <Box twClassName="flex-row items-center">
          {/* Left: Icon + Info */}
          <Box twClassName="flex-1 flex-row items-center">
            <Icon name={icon} color={iconColor} size={24} />
            <Box twClassName="ml-3 flex-1">
              <Text variant={TextVariant.BodyMdBold}>
                {isYes ? 'YES' : 'NO'} bet placed!
              </Text>
              <Text variant={TextVariant.BodySm} twClassName="text-muted" numberOfLines={1}>
                {marketTitle}
              </Text>
              <Text variant={TextVariant.BodySm}>
                ${betAmount.toFixed(2)} → Win ${potentialWin.toFixed(2)}
              </Text>
            </Box>
          </Box>

          {/* Right: Undo Button with Circular Progress */}
          <Pressable
            onPress={handleUndo}
            twClassName="items-center justify-center"
          >
            <CircularProgress
              progress={progress}
              size={48}
              strokeWidth={3}
              color={isYes ? '#22C55E' : '#EF4444'}
            >
              <Box twClassName="items-center justify-center">
                <Icon name={IconName.Undo} size={20} color={IconColor.Default} />
              </Box>
            </CircularProgress>
            <Text variant={TextVariant.BodyXs} twClassName="mt-1">
              Undo
            </Text>
          </Pressable>
        </Box>
      </Box>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    bottom: 100,  // Above the skip indicator
    left: 0,
    right: 0,
    zIndex: 1000,
  },
});
```

**Circular Progress Component** (for countdown):

```typescript
interface CircularProgressProps {
  progress: SharedValue<number>;  // 1 = full, 0 = empty
  size: number;
  strokeWidth: number;
  color: string;
  children?: React.ReactNode;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  progress,
  size,
  strokeWidth,
  color,
  children,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <Box style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {/* Center content */}
      <Box style={StyleSheet.absoluteFill} twClassName="items-center justify-center">
        {children}
      </Box>
    </Box>
  );
};
```

**Hook for managing Undo Toast**:

```typescript
function useUndoToast(onUndo: () => void) {
  const [toastState, setToastState] = useState<UndoToastState | null>(null);

  const showUndoToast = useCallback(
    (params: Omit<UndoToastState, 'isVisible' | 'startTime'>) => {
      setToastState({
        ...params,
        isVisible: true,
        startTime: Date.now(),
      });
    },
    [],
  );

  const hideUndoToast = useCallback(() => {
    setToastState(null);
  }, []);

  const handleUndo = useCallback(() => {
    hideUndoToast();
    onUndo();
  }, [hideUndoToast, onUndo]);

  return {
    toastState,
    showUndoToast,
    hideUndoToast,
    handleUndo,
  };
}
```

**Integration in Game Orchestrator**:

```typescript
const handleSwipeRight = async () => {
  // YES bet
  triggerHaptic('success');
  swipeGameAudio.playSound('swipeYes');

  const card = state.cards[state.currentIndex];
  const preview = previews.get(card.marketId);

  setState((s) => ({ ...s, isPendingOrder: true }));

  const result = await placeBetOnSwipe(card, preview, 'yes', state.betAmount);

  if (result.success) {
    // Advance to next card
    setState((s) => ({
      ...s,
      currentIndex: s.currentIndex + 1,
      isPendingOrder: false,
      sessionStats: {
        ...s.sessionStats,
        betsPlaced: s.sessionStats.betsPlaced + 1,
        totalWagered: s.sessionStats.totalWagered + s.betAmount,
      },
    }));

    // Show undo toast
    showUndoToast({
      betType: 'yes',
      marketTitle: card.title,
      betAmount: state.betAmount,
      potentialWin: preview.yesPreview?.potentialWin ?? 0,
    });
  } else {
    setState((s) => ({ ...s, isPendingOrder: false }));
    showErrorToast(result.error);
  }
};

const handleUndo = useCallback(() => {
  if (state.currentIndex > 0) {
    setState((s) => ({
      ...s,
      currentIndex: s.currentIndex - 1,
    }));

    // Note: The bet still stands - we're just going back to review the card
    // Could show a subtle toast: "Going back. Previous bet is still active."
  }
}, [state.currentIndex]);
```

**Undo Behavior**:

- Toast appears immediately after successful bet
- Shows bet details (YES/NO, market title, amount, potential win)
- Circular progress ring counts down from full to empty over 5 seconds
- Tapping "Undo" goes back to the previous card
- **The bet still stands** (CLOB orders can't be cancelled once submitted)
- After undo, user sees the same card and can bet again if desired

### 5.3 Sound & Haptic Feedback

```typescript
// sounds.ts
import { Audio } from 'expo-av'; // or react-native-sound
import { Vibration, Platform } from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

type SoundType =
  | 'swipeYes'
  | 'swipeNo'
  | 'skip'
  | 'undo'
  | 'error'
  | 'cardAppear';
type HapticType =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'warning'
  | 'error';

const SOUND_FILES: Record<SoundType, any> = {
  swipeYes: require('../assets/sounds/swipe-yes.mp3'),
  swipeNo: require('../assets/sounds/swipe-no.mp3'),
  skip: require('../assets/sounds/skip.mp3'),
  undo: require('../assets/sounds/undo.mp3'),
  error: require('../assets/sounds/error.mp3'),
  cardAppear: require('../assets/sounds/card-appear.mp3'),
};

const HAPTIC_MAP: Record<HapticType, string> = {
  light: 'impactLight',
  medium: 'impactMedium',
  heavy: 'impactHeavy',
  success: 'notificationSuccess',
  warning: 'notificationWarning',
  error: 'notificationError',
};

class SwipeGameAudio {
  private sounds: Map<SoundType, Audio.Sound> = new Map();
  private isEnabled: boolean = true;

  async preloadSounds() {
    for (const [type, file] of Object.entries(SOUND_FILES)) {
      const { sound } = await Audio.Sound.createAsync(file);
      this.sounds.set(type as SoundType, sound);
    }
  }

  async playSound(type: SoundType) {
    if (!this.isEnabled) return;

    const sound = this.sounds.get(type);
    if (sound) {
      await sound.setPositionAsync(0);
      await sound.playAsync();
    }
  }

  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }
}

export const swipeGameAudio = new SwipeGameAudio();

export function triggerHaptic(type: HapticType) {
  const hapticType = HAPTIC_MAP[type];

  if (Platform.OS === 'ios') {
    ReactNativeHapticFeedback.trigger(hapticType, {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });
  } else {
    // Android fallback
    const patterns: Record<HapticType, number[]> = {
      light: [0, 10],
      medium: [0, 20],
      heavy: [0, 30],
      success: [0, 10, 50, 10],
      warning: [0, 20, 40, 20],
      error: [0, 30, 50, 30, 50, 30],
    };
    Vibration.vibrate(patterns[type]);
  }
}
```

**Integration with swipe actions**:

```typescript
const handleSwipeRight = async () => {
  // YES bet
  triggerHaptic('success');
  swipeGameAudio.playSound('swipeYes');

  setState((s) => ({ ...s, isPendingOrder: true }));
  // ... rest of order logic
};

const handleSwipeLeft = async () => {
  // NO bet
  triggerHaptic('medium');
  swipeGameAudio.playSound('swipeNo');

  // ... order logic
};

const handleSwipeDown = () => {
  // Skip
  triggerHaptic('light');
  swipeGameAudio.playSound('skip');

  // ... skip logic
};

const handleOrderError = () => {
  triggerHaptic('error');
  swipeGameAudio.playSound('error');
};
```

**Feedback hook**:

```typescript
function useSwipeFeedback() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticEnabled, setHapticEnabled] = useState(true);

  useEffect(() => {
    // Preload sounds on mount
    swipeGameAudio.preloadSounds();
  }, []);

  const playFeedback = useCallback(
    (action: 'yes' | 'no' | 'skip' | 'undo' | 'error') => {
      // Map action to sound and haptic type
      const feedbackMap = {
        yes: { sound: 'swipeYes', haptic: 'success' },
        no: { sound: 'swipeNo', haptic: 'medium' },
        skip: { sound: 'skip', haptic: 'light' },
        undo: { sound: 'undo', haptic: 'warning' },
        error: { sound: 'error', haptic: 'error' },
      } as const;

      const config = feedbackMap[action];

      if (soundEnabled) {
        swipeGameAudio.playSound(config.sound);
      }

      if (hapticEnabled) {
        triggerHaptic(config.haptic);
      }
    },
    [soundEnabled, hapticEnabled],
  );

  return {
    playFeedback,
    soundEnabled,
    setSoundEnabled,
    hapticEnabled,
    setHapticEnabled,
  };
}
```

### 5.4 Game Orchestrator Hook

```typescript
interface SwipeGameState {
  cards: SwipeGameCard[];
  currentIndex: number;
  betAmount: number;
  isLoading: boolean;
  isPendingOrder: boolean;
  balance: number;
  sessionStats: {
    betsPlaced: number;
    totalWagered: number;
    skipped: number;
  };
}

function useSwipeGame() {
  const [state, setState] = useState<SwipeGameState>({
    cards: [],
    currentIndex: 0,
    betAmount: 5, // Default $5
    isLoading: true,
    isPendingOrder: false,
    balance: 0,
    sessionStats: { betsPlaced: 0, totalWagered: 0, skipped: 0 },
  });

  const { markets, fetchMore } = usePredictMarketData({ category: 'trending' });
  const { getBalance } = usePredictTrading();
  const { placeOrder } = usePredictPlaceOrder();

  // Transform markets to cards
  useEffect(() => {
    const cards = markets.map(transformMarketToCard);
    setState((s) => ({ ...s, cards, isLoading: false }));
  }, [markets]);

  // Prefetch more cards when running low
  useEffect(() => {
    if (state.cards.length - state.currentIndex < 5) {
      fetchMore();
    }
  }, [state.currentIndex, state.cards.length]);

  const handleSwipeLeft = async () => {
    // YES bet
    setState((s) => ({ ...s, isPendingOrder: true }));

    const card = state.cards[state.currentIndex];
    const result = await placeBetOnSwipe(card, preview, 'yes', state.betAmount);

    if (result.success) {
      setState((s) => ({
        ...s,
        currentIndex: s.currentIndex + 1,
        isPendingOrder: false,
        sessionStats: {
          ...s.sessionStats,
          betsPlaced: s.sessionStats.betsPlaced + 1,
          totalWagered: s.sessionStats.totalWagered + s.betAmount,
        },
      }));
    } else {
      // Show error, don't advance
      setState((s) => ({ ...s, isPendingOrder: false }));
      showErrorToast(result.error);
    }
  };

  const handleSwipeRight = async () => {
    // NO bet - similar to above
  };

  const handleSwipeDown = () => {
    // Skip - just advance
    setState((s) => ({
      ...s,
      currentIndex: s.currentIndex + 1,
      sessionStats: {
        ...s.sessionStats,
        skipped: s.sessionStats.skipped + 1,
      },
    }));
  };

  const setBetAmount = (amount: number) => {
    setState((s) => ({ ...s, betAmount: amount }));
  };

  return {
    ...state,
    currentCard: state.cards[state.currentIndex],
    hasMoreCards: state.currentIndex < state.cards.length,
    handleSwipeLeft,
    handleSwipeRight,
    handleSwipeDown,
    setBetAmount,
  };
}
```

### 5.3 Balance & Eligibility Checks

Before allowing bets:

```typescript
function useSwipeGameEligibility(betAmount: number) {
  const { isEligible, isLoading: eligibilityLoading } = usePredictEligibility();
  const { balance, isLoading: balanceLoading } = usePredictBalance();
  const { accountState } = usePredictAccountState();

  const canBet = useMemo(() => {
    if (!isEligible) return { allowed: false, reason: 'geo_blocked' };
    if (balance < betAmount)
      return { allowed: false, reason: 'insufficient_balance' };
    if (!accountState?.isDeployed)
      return { allowed: false, reason: 'account_not_setup' };
    return { allowed: true, reason: null };
  }, [isEligible, balance, betAmount, accountState]);

  return {
    canBet,
    balance,
    isLoading: eligibilityLoading || balanceLoading,
  };
}
```

---

## 6. State Management

### 6.1 Local State (Component Level)

- Current card index
- Bet amount
- Selected outcome (for multi-outcome)
- Animation state
- Loading states

### 6.2 Session State (Memory Only)

```typescript
interface SwipeGameSession {
  sessionId: string;
  startTime: number;
  cardsViewed: number;
  betsPlaced: number;
  betsSkipped: number;
  totalWagered: number;
  outcomes: Array<{
    marketId: string;
    action: 'yes' | 'no' | 'skip';
    amount?: number;
    timestamp: number;
  }>;
}
```

### 6.3 Persisted State

User preferences (stored in AsyncStorage or similar):

```typescript
interface SwipeGamePreferences {
  defaultBetAmount: number;
  hasSeenTutorial: boolean;
  hapticFeedbackEnabled: boolean;
}
```

---

## 7. Navigation & Integration

### 7.1 Navigation Structure

Add to existing Predict navigation stack:

```typescript
// In routes/index.tsx
const PredictStack = createStackNavigator<PredictStackParamList>();

export type PredictStackParamList = {
  PredictTabView: undefined;
  PredictMarketDetails: { marketId: string };
  PredictSwipeGame: undefined;  // NEW
  // ... other routes
};

// Add screen
<PredictStack.Screen
  name="PredictSwipeGame"
  component={PredictSwipeGame}
  options={{
    headerShown: false,
    gestureEnabled: false, // Disable back swipe to prevent conflicts
    presentation: 'fullScreenModal',
  }}
/>
```

### 7.2 Entry Point

Add a button to enter the game from the main Predict view:

```typescript
// In PredictTabView or PredictFeedHeader
const SwipeGameButton: React.FC = () => {
  const navigation = useNavigation<PredictNavigationProp>();

  return (
    <Pressable
      onPress={() => navigation.navigate('PredictSwipeGame')}
      twClassName="bg-primary rounded-full px-6 py-3 flex-row items-center"
    >
      <Icon name={IconName.Fire} color={IconColor.OnPrimary} />
      <Text twClassName="text-on-primary ml-2 font-bold">
        Quick Bet
      </Text>
    </Pressable>
  );
};
```

---

## 8. Analytics

### 8.1 Events to Track

```typescript
// New analytics events
enum SwipeGameAnalyticsEvents {
  SWIPE_GAME_STARTED = 'PREDICT_SWIPE_GAME_STARTED',
  SWIPE_GAME_ENDED = 'PREDICT_SWIPE_GAME_ENDED',
  SWIPE_ACTION = 'PREDICT_SWIPE_ACTION',
  BET_AMOUNT_CHANGED = 'PREDICT_SWIPE_BET_AMOUNT_CHANGED',
  OUTCOME_SELECTED = 'PREDICT_SWIPE_OUTCOME_SELECTED',
}

// Event properties
interface SwipeGameEventProperties {
  session_id: string;
  cards_viewed: number;
  bets_placed: number;
  bets_skipped: number;
  total_wagered: number;
  session_duration_seconds: number;
  entry_point: string;
}

interface SwipeActionEventProperties {
  session_id: string;
  market_id: string;
  market_title: string;
  action: 'yes' | 'no' | 'skip';
  bet_amount?: number;
  card_position: number;
  time_on_card_seconds: number;
}
```

### 8.2 Analytics Hook

```typescript
function useSwipeAnalytics() {
  const sessionRef = useRef({
    sessionId: generateUUID(),
    startTime: Date.now(),
    cardStartTime: Date.now(),
  });

  const trackGameStart = useCallback((entryPoint: string) => {
    MetaMetrics.getInstance().trackEvent(
      MetricsEventBuilder.createEventBuilder(
        SwipeGameAnalyticsEvents.SWIPE_GAME_STARTED
      )
      .addProperties({
        session_id: sessionRef.current.sessionId,
        entry_point: entryPoint,
      })
      .build()
    );
  }, []);

  const trackSwipeAction = useCallback((
    action: 'yes' | 'no' | 'skip',
    market: SwipeGameCard,
    betAmount?: number,
    cardPosition: number,
  ) => {
    const timeOnCard = (Date.now() - sessionRef.current.cardStartTime) / 1000;
    sessionRef.current.cardStartTime = Date.now();

    MetaMetrics.getInstance().trackEvent(
      MetricsEventBuilder.createEventBuilder(
        SwipeGameAnalyticsEvents.SWIPE_ACTION
      )
      .addProperties({
        session_id: sessionRef.current.sessionId,
        market_id: market.marketId,
        market_title: market.title,
        action,
        card_position: cardPosition,
        time_on_card_seconds: timeOnCard,
      })
      .addSensitiveProperties({
        bet_amount: betAmount,
      })
      .build()
    );
  }, []);

  // ... more tracking methods

  return { trackGameStart, trackSwipeAction, ... };
}
```

---

## 9. Error Handling

### 9.1 Error Types

```typescript
enum SwipeGameErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  ORDER_FAILED = 'ORDER_FAILED',
  MARKET_UNAVAILABLE = 'MARKET_UNAVAILABLE',
  PRICE_CHANGED = 'PRICE_CHANGED',
  GEO_BLOCKED = 'GEO_BLOCKED',
}
```

### 9.2 Error Recovery Strategies

```typescript
const ERROR_RECOVERY: Record<SwipeGameErrorType, ErrorRecovery> = {
  [SwipeGameErrorType.NETWORK_ERROR]: {
    action: 'retry',
    message: 'Network error. Tap to retry.',
    autoRetry: true,
    maxRetries: 3,
  },
  [SwipeGameErrorType.INSUFFICIENT_BALANCE]: {
    action: 'deposit',
    message: 'Insufficient balance. Add funds to continue.',
    showButton: true,
    buttonText: 'Add Funds',
  },
  [SwipeGameErrorType.ORDER_FAILED]: {
    action: 'retry_or_skip',
    message: 'Order failed. Retry or skip this market.',
    showRetry: true,
    showSkip: true,
  },
  [SwipeGameErrorType.PRICE_CHANGED]: {
    action: 'refresh',
    message: 'Price changed significantly. Refreshing...',
    autoRefresh: true,
  },
  [SwipeGameErrorType.GEO_BLOCKED]: {
    action: 'exit',
    message: 'Betting is not available in your region.',
    showExit: true,
  },
};
```

### 9.3 Error Display Component

```typescript
const SwipeGameError: React.FC<{
  error: SwipeGameErrorType;
  onRetry: () => void;
  onSkip: () => void;
  onExit: () => void;
}> = ({ error, onRetry, onSkip, onExit }) => {
  const recovery = ERROR_RECOVERY[error];

  return (
    <Box twClassName="absolute inset-0 bg-default/90 items-center justify-center p-6">
      <Icon name={IconName.Warning} size={48} color={IconColor.Error} />
      <Text variant={TextVariant.HeadingMd} twClassName="mt-4 text-center">
        {recovery.message}
      </Text>

      <Box twClassName="flex-row gap-4 mt-6">
        {recovery.showRetry && (
          <Button label="Retry" onPress={onRetry} variant="primary" />
        )}
        {recovery.showSkip && (
          <Button label="Skip" onPress={onSkip} variant="secondary" />
        )}
        {recovery.showExit && (
          <Button label="Exit" onPress={onExit} variant="tertiary" />
        )}
      </Box>
    </Box>
  );
};
```

---

## 10. Testing Strategy

### 10.1 Unit Tests

```typescript
// useSwipeGame.test.ts
describe('useSwipeGame', () => {
  it('should initialize with default bet amount of $5', () => {});
  it('should transform markets to swipe cards correctly', () => {});
  it('should sort outcomes by volume', () => {});
  it('should advance to next card on successful bet', () => {});
  it('should not advance on failed bet', () => {});
  it('should track session stats correctly', () => {});
  it('should fetch more cards when running low', () => {});
});

// transformMarketToCard.test.ts
describe('transformMarketToCard', () => {
  it('should handle binary markets (Yes/No)', () => {});
  it('should handle multi-outcome markets', () => {});
  it('should select highest volume outcome as primary', () => {});
  it('should correctly identify Yes and No tokens', () => {});
});

// useSwipeGesture.test.ts
describe('useSwipeGesture', () => {
  it('should call onSwipeLeft when threshold is exceeded', () => {});
  it('should call onSwipeRight when threshold is exceeded', () => {});
  it('should call onSwipeDown for vertical swipe', () => {});
  it('should snap back when threshold not met', () => {});
});
```

### 10.2 Integration Tests

```typescript
// PredictSwipeGame.test.tsx
describe('PredictSwipeGame', () => {
  it('should render loading state initially', () => {});
  it('should display first market card', () => {});
  it('should show Yes/No indicators with correct prices', () => {});
  it('should place bet on swipe left', () => {});
  it('should skip on swipe down', () => {});
  it('should handle insufficient balance', () => {});
  it('should update bet amount when changed', () => {});
});
```

### 10.3 E2E Tests

```typescript
// swipe-game.spec.ts
describe('Predict Swipe Game', () => {
  beforeEach(async () => {
    await device.launchApp();
    await loginWithTestAccount();
    await navigateToPredictSwipeGame();
  });

  it('places a Yes bet via swipe left', async () => {
    await expect(element(by.id('swipe-card'))).toBeVisible();
    await element(by.id('swipe-card')).swipe('left', 'fast');
    await expect(element(by.text('Prediction placed'))).toBeVisible();
  });

  it('skips market via swipe down', async () => {
    const firstCardTitle = await element(by.id('card-title')).getAttributes();
    await element(by.id('swipe-card')).swipe('down', 'fast');
    const secondCardTitle = await element(by.id('card-title')).getAttributes();
    expect(firstCardTitle).not.toBe(secondCardTitle);
  });
});
```

---

## 11. Implementation Phases

### Phase 1: Core Infrastructure (1 week)

**Goal**: Basic swipeable card with data layer

**Tasks**:

1. [ ] Create file structure
2. [ ] Implement `transformMarketToCard` utility
3. [ ] Create `useSwipeGame` hook (without betting)
4. [ ] Build basic `SwipeCard` component
5. [ ] Implement `useSwipeGesture` hook
6. [ ] Test swipe detection works

**Deliverable**: Cards can be swiped but no bets are placed

### Phase 2: Betting Integration (1 week)

**Goal**: Connect swipe actions to actual orders

**Tasks**:

1. [ ] Implement `useCardPreviews` for price fetching
2. [ ] Add order placement on swipe
3. [ ] Handle success/failure states
4. [ ] Add loading states during order
5. [ ] Implement balance checks

**Deliverable**: Users can place real bets by swiping

### Phase 3: UI Polish & Feedback (1 week)

**Goal**: Beautiful, polished UI with sound and haptics

**Tasks**:

1. [ ] Implement levitating animation for active card
2. [ ] Build `SwipeIndicator` components (Yes/No/Skip)
3. [ ] Create `SwipeOverlay` feedback during swipe
4. [ ] Implement `BetAmountSelector` with bottom sheet
5. [ ] Add `OutcomeSelector` for multi-outcome markets
6. [ ] Card stack visualization (show next 2 cards behind)
7. [ ] **Implement `UndoToast` with circular countdown progress**
8. [ ] **Build `CircularProgress` component for countdown**
9. [ ] **Add haptic feedback on swipe actions**
10. [ ] **Add sound effects (preload, play on action)**
11. [ ] **Settings toggle for sound/haptic preferences**

**Deliverable**: Polished, delightful UI with audio/haptic feedback

### Phase 4: Edge Cases & Error Handling (0.5 week)

**Goal**: Robust error handling

**Tasks**:

1. [ ] Implement all error states
2. [ ] Add retry mechanisms
3. [ ] Handle geo-blocking
4. [ ] Handle network issues
5. [ ] Add session persistence (if user leaves)

**Deliverable**: Production-ready error handling

### Phase 5: Analytics & Testing (0.5 week)

**Goal**: Full test coverage and analytics

**Tasks**:

1. [ ] Implement analytics events
2. [ ] Write unit tests
3. [ ] Write integration tests
4. [ ] Write E2E tests
5. [ ] QA testing

**Deliverable**: Fully tested feature

### Phase 6: Navigation & Launch (0.5 week)

**Goal**: Integration into app

**Tasks**:

1. [ ] Add navigation routes
2. [ ] Create entry point button
3. [ ] Feature flag integration
4. [ ] Documentation
5. [ ] Launch review

**Deliverable**: Feature ready for release

---

## 12. Open Questions

### ✅ Resolved Questions

| #   | Question                 | Decision                                                             |
| --- | ------------------------ | -------------------------------------------------------------------- |
| 1   | Swipe Direction Mapping  | ✅ **Right = Yes**, **Left = No** (intuitive mapping)                |
| 4   | Confirmation before bet? | ✅ **No confirmation** - use undo feature instead                    |
| 5   | Undo feature?            | ✅ **Yes** - 5-second undo window (uses existing rate limit)         |
| 8   | Multi-outcome markets    | ✅ **Show highest volume as primary**, others selectable inside card |
| 13  | Onboarding flow          | ✅ **Not needed** for MVP                                            |
| 17  | Sound effects            | ✅ **Yes** - sound effects + haptic/vibration feedback               |

### 🟡 Remaining Questions (Lower Priority - Can Decide During Implementation)

2. **What happens when user runs out of cards?**
   - 💡 **Suggested**: Auto-load more markets, show "All caught up!" if truly empty

3. **Should we show historical performance?**
   - 💡 **Suggested**: Save for v2 (e.g., "You're 3/5 on Yes bets today")

4. **Order preview timing**
   - 💡 **Suggested**: Auto-refresh previews every 10s, show "updating..." badge if stale

5. **Rate limiting UX**
   - 💡 **Suggested**: Disable swipe during 5s rate limit, show countdown timer in undo button

6. **Card preloading strategy**
   - 💡 **Suggested**: Preload next 3 cards, prefetch previews for current + next 2

7. **Minimum/Maximum bet amount?**
   - 💡 **Suggested**: Min $1, Max $100 (or based on available liquidity)

8. **Fee display**
   - 💡 **Suggested**: Show net "potential win" amounts, fees visible in expandable section

9. **Balance visibility**
   - 💡 **Suggested**: Show balance in header, highlight when running low

10. **Card content depth**
    - 💡 **Suggested**: Title, image, end date, volume badge. Keep it minimal and scannable.

11. **Indicator positioning**
    - 💡 **Suggested**: Fixed position, scale up when swiping toward them

12. **Theme**
    - 💡 **Suggested**: Match existing Predict theme for visual consistency

---

## Appendix A: Design Inspiration

- Tinder (swipe mechanics)
- Robinhood (betting/trading UX)
- Bumble BFF (skip gesture)
- Duolingo (gamification, streaks)

## Appendix B: Dependencies

```json
{
  "dependencies": {
    "react-native-gesture-handler": "^2.x",
    "react-native-reanimated": "^3.x",
    "@react-navigation/stack": "^6.x",
    "react-native-haptic-feedback": "^2.x",
    "react-native-svg": "^15.x"
  }
}
```

**Existing in project**: gesture-handler, reanimated, navigation, react-native-svg ✅  
**May need to add**: react-native-haptic-feedback (check if already present)

**For sounds**: Can use either:

- `expo-av` (if using Expo)
- `react-native-sound` (bare RN)
- Or simple `Audio` from React Native

**Sound files needed** (can source from freesound.org or similar):

- `swipe-yes.mp3` - Positive confirmation sound (~0.3s)
- `swipe-no.mp3` - Neutral/different confirmation (~0.3s)
- `skip.mp3` - Quick whoosh sound (~0.2s)
- `undo.mp3` - Reverse/rewind sound (~0.3s)
- `error.mp3` - Error/warning sound (~0.3s)
- `card-appear.mp3` - Subtle pop/slide sound (~0.2s)

## Appendix C: Related Files

- `app/components/UI/Predict/hooks/usePredictMarketData.tsx`
- `app/components/UI/Predict/hooks/usePredictOrderPreview.ts`
- `app/components/UI/Predict/hooks/usePredictPlaceOrder.ts`
- `app/components/UI/Predict/controllers/PredictController.ts`
- `app/components/UI/Predict/providers/polymarket/PolymarketProvider.ts`
