# Task 08: PredictGameDetailsContent Component

## Description

Create a component that renders inside the existing `PredictMarketDetails` view when `market.game` exists. This is NOT a separate view/route - it's a component that conditionally renders within the existing market details screen.

## Architecture Decision

**NO separate GAME_DETAILS route.** The existing `MARKET_DETAILS` route renders:

- `PredictGameDetailsContent` when `market.game` exists
- `PredictMarketDetailsContent` (existing) when `market.game` is null

This simplifies navigation and maintains a single entry point for all market details.

## Requirements

- Component renders inside existing `PredictMarketDetails` view
- Scoreboard with live score updates (subscribes to `useLiveGameUpdates`)
- Chart with live prices (subscribes to `useLiveMarketPrices`)
- Position rows (each subscribes to `useLiveTokenPrice`)
- Action footer (subscribes to `useLiveMarketPrices`)
- **Granular subscriptions** - each sub-component subscribes to its own data
- Dark/light mode support
- Unit tests

## Dependencies

- Task 00: Feature Flag and Data Types
- Task 02: Live Data Hooks
- Task 03: UI Primitives
- Task 06: PredictGameChart
- Task 07: PredictGamePosition

## Designs

- @nfl-details-page-variations.png - All screen states
- @nfl-details-dark-light.png - Theme variations

### Design Specifications

**Component Structure:**

1. TeamGradient overlay
2. Scoreboard: Team helmets, scores/percentages, status badge
3. Chart: Dual-line probability chart with timeframe selector
4. Positions: "Your picks" section (if user has positions)
5. Footer: Market info bar + action buttons

## Granular Subscriptions Pattern (CRITICAL)

Each sub-component subscribes to only the data it needs:

| Component                      | Subscribes To                   |
| ------------------------------ | ------------------------------- |
| GameScoreboard                 | `useLiveGameUpdates(gameId)`    |
| PredictGameChart               | `useLiveMarketPrices(tokenIds)` |
| GameDetailsFooter              | `useLiveMarketPrices(tokenIds)` |
| PredictGamePosition (each row) | `useLiveTokenPrice(tokenId)`    |

**NO composite hook that aggregates all data.** This ensures minimal re-renders when updates arrive.

## Implementation

### 1. Modify Existing PredictMarketDetails View

Update the existing `PredictMarketDetails` view to conditionally render game content:

```typescript
// In app/components/UI/Predict/views/PredictMarketDetails/PredictMarketDetails.tsx

// Add this conditional render
if (market.game) {
  return (
    <PredictGameDetailsContent
      market={market}
      positions={positions}
      onCashOut={handleCashOut}
      onClaim={handleClaim}
      onBuy={handleBuy}
      onBack={handleBack}
      onShare={handleShare}
      onRefresh={handleRefresh}
      refreshing={refreshing}
      entryPoint={entryPoint}
    />
  );
}

// else render existing PredictMarketDetailsContent...
```

### 2. Component Structure

Create `app/components/UI/Predict/components/PredictGameDetailsContent/`:

**PredictGameDetailsContent.tsx:**

```typescript
import React, { useState, useMemo } from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../util/theme';
import {
  PredictMarket,
  PredictPosition,
  PredictOutcomeToken,
  PredictPriceHistoryInterval,
} from '../../types';
import { ChartTimeframe } from '../PredictGameChart/PredictGameChart.types';
import { usePredictPriceHistory } from '../../hooks/usePredictPriceHistory';
import TeamGradient from '../TeamGradient';
import PredictGameChart from '../PredictGameChart';
import { PredictGamePositionsSection } from '../PredictGamePosition';
import GameScoreboard from './GameScoreboard';
import GameDetailsFooter from './GameDetailsFooter';

// Map chart timeframe to price history interval
const TIMEFRAME_TO_INTERVAL: Record<ChartTimeframe, PredictPriceHistoryInterval> = {
  live: PredictPriceHistoryInterval.ONE_HOUR,
  '6h': PredictPriceHistoryInterval.SIX_HOUR,
  '1d': PredictPriceHistoryInterval.ONE_DAY,
  max: PredictPriceHistoryInterval.MAX,
};

interface PredictGameDetailsContentProps {
  market: PredictMarket;
  positions: PredictPosition[];
  onCashOut: (position: PredictPosition) => void;
  onClaim: () => void;
  onBuy: (token: PredictOutcomeToken) => void;
  onBack: () => void;
  onShare: () => void;
  onRefresh: () => Promise<void>;
  refreshing: boolean;
  entryPoint: string;
}

/**
 * Content component for NFL game markets.
 * Rendered inside PredictMarketDetails when market.game exists.
 *
 * IMPORTANT: This component does NOT subscribe to live data itself.
 * Each sub-component (Scoreboard, Chart, Positions, Footer) subscribes
 * to only the data it needs for optimal re-render performance.
 */
const PredictGameDetailsContent: React.FC<PredictGameDetailsContentProps> = ({
  market,
  positions,
  onCashOut,
  onClaim,
  onBuy,
  onRefresh,
  refreshing,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();

  const [timeframe, setTimeframe] = useState<ChartTimeframe>('live');

  const game = market.game!; // We know game exists if this component renders

  // Fetch price history for chart (API data, not live)
  const { priceHistory, isLoading: historyLoading } = usePredictPriceHistory({
    marketId: market.id,
    interval: TIMEFRAME_TO_INTERVAL[timeframe],
  });

  const tokens = market.outcomes[0]?.tokens ?? [];
  const awayToken = tokens[0];
  const homeToken = tokens[1];
  const tokenIds = useMemo(() => tokens.map(t => t.id), [tokens]);

  // Build chart data from price history
  const chartData = useMemo(() => {
    if (!priceHistory) return [];

    return tokens.slice(0, 2).map((token, index) => ({
      label: index === 0 ? game.awayTeam.abbreviation : game.homeTeam.abbreviation,
      color: index === 0 ? game.awayTeam.color : game.homeTeam.color,
      data: priceHistory
        .filter(p => p.tokenId === token.id)
        .map(p => ({
          timestamp: p.timestamp,
          value: p.price * 100,
        })),
    }));
  }, [priceHistory, tokens, game]);

  return (
    <>
      {/* Team gradient background */}
      <TeamGradient
        awayColor={game.awayTeam.color}
        homeColor={game.homeTeam.color}
      />

      {/* Content */}
      <ScrollView
        style={tw.style('flex-1')}
        contentContainerStyle={tw.style('pb-4')}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary.default}
          />
        }
      >
        {/* Scoreboard - subscribes to useLiveGameUpdates internally */}
        <GameScoreboard
          game={game}
          awayTokenPrice={awayToken?.price}
          homeTokenPrice={homeToken?.price}
        />

        {/* Chart - subscribes to useLiveMarketPrices internally */}
        <Box twClassName="px-4 mt-4">
          <PredictGameChart
            data={chartData}
            tokenIds={tokenIds}
            isLoading={historyLoading}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
          />
        </Box>

        {/* Positions - each row subscribes to useLiveTokenPrice internally */}
        {positions.length > 0 && (
          <Box twClassName="px-4">
            <PredictGamePositionsSection
              positions={positions}
              game={game}
              onCashOut={onCashOut}
              onClaim={onClaim}
            />
          </Box>
        )}
      </ScrollView>

      {/* Footer - subscribes to useLiveMarketPrices internally */}
      <GameDetailsFooter
        market={market}
        game={game}
        awayToken={awayToken}
        homeToken={homeToken}
        hasClaimablePosition={positions.some(p => p.isClaimable)}
        onBuyAway={() => onBuy(awayToken)}
        onBuyHome={() => onBuy(homeToken)}
        onClaim={onClaim}
      />
    </>
  );
};

export default PredictGameDetailsContent;
```

### 2. Sub-components

**GameDetailsHeader.tsx:**

```typescript
import React from 'react';
import { Pressable } from 'react-native';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';

interface GameDetailsHeaderProps {
  title: string;
  onBack: () => void;
  onShare?: () => void;
}

const GameDetailsHeader: React.FC<GameDetailsHeaderProps> = ({
  title,
  onBack,
  onShare,
}) => {
  const tw = useTailwind();

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="px-4 py-3"
    >
      <Pressable
        onPress={onBack}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Icon
          name={IconName.ArrowLeft}
          size={IconSize.Md}
          color={IconColor.Default}
        />
      </Pressable>

      <Text
        variant={TextVariant.HeadingMd}
        color={TextColor.TextDefault}
        style={tw.style('flex-1 text-center mx-4')}
        numberOfLines={1}
      >
        {title}
      </Text>

      {onShare ? (
        <Pressable
          onPress={onShare}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon
            name={IconName.Share}
            size={IconSize.Md}
            color={IconColor.Default}
          />
        </Pressable>
      ) : (
        <Box twClassName="w-6" />
      )}
    </Box>
  );
};

export default GameDetailsHeader;
```

**GameScoreboard.tsx:**

```typescript
import React, { useMemo } from 'react';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { PredictMarketGame } from '../../types';
import TeamHelmet from '../TeamHelmet';
import FootballIcon from '../FootballIcon';
import { useLiveGameUpdates } from '../../hooks/useLiveGameUpdates';
import {
  formatPeriodDisplay,
  formatScheduledTime,
  parseScore,
  getOddsPercentage,
} from '../../utils/gameParser';

interface GameScoreboardProps {
  game: PredictMarketGame;
  awayTokenPrice?: number;
  homeTokenPrice?: number;
}

/**
 * Scoreboard component that subscribes to live game updates.
 * Only THIS component re-renders when game score/status changes.
 */
const GameScoreboard: React.FC<GameScoreboardProps> = ({
  game,
  awayTokenPrice,
  homeTokenPrice,
}) => {
  const tw = useTailwind();

  // Subscribe to live game updates
  const { gameUpdate } = useLiveGameUpdates(game.id);

  // Merge live data with initial game data
  const displayGame = useMemo(() => {
    if (!gameUpdate) return game;
    return {
      ...game,
      score: gameUpdate.score,
      elapsed: gameUpdate.elapsed,
      period: gameUpdate.period,
      status: gameUpdate.status,
      turn: gameUpdate.turn,
    };
  }, [game, gameUpdate]);

  const { away: awayScore, home: homeScore } = parseScore(displayGame.score);

  const awayHasPossession =
    game.turn?.toLowerCase() === game.awayTeam.abbreviation.toLowerCase();
  const homeHasPossession =
    game.turn?.toLowerCase() === game.homeTeam.abbreviation.toLowerCase();

  const showScores = game.status === 'ongoing' || game.status === 'ended';
  const showPercentages = game.status === 'scheduled';

  const renderStatusBadge = () => {
    if (game.status === 'scheduled') {
      const { date, time } = formatScheduledTime(game.startTime);
      return (
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextDefault}
          style={tw.style('text-center font-bold')}
        >
          {date} @ {time}
        </Text>
      );
    }

    if (game.status === 'ended') {
      return (
        <Box twClassName="px-3 py-1 rounded-full bg-background-alternative">
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextDefault}
            style={tw.style('font-medium')}
          >
            {formatPeriodDisplay(game.period || 'FT')}
          </Text>
        </Box>
      );
    }

    // Ongoing
    return (
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-2 px-3 py-1 rounded-full bg-error-muted"
      >
        <Box twClassName="w-2 h-2 rounded-full bg-error-default" />
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.ErrorDefault}
          style={tw.style('font-medium')}
        >
          {formatPeriodDisplay(game.period || '')}
          {game.elapsed ? ` ${game.elapsed}` : ''}
        </Text>
      </Box>
    );
  };

  return (
    <Box twClassName="px-4 py-6">
      {/* Status badge */}
      <Box twClassName="items-center mb-4">
        {renderStatusBadge()}
      </Box>

      {/* Teams and scores/percentages */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Start}
        justifyContent={BoxJustifyContent.Between}
      >
        {/* Away team */}
        <Box twClassName="items-center flex-1">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-3"
          >
            <TeamHelmet color={game.awayTeam.color} size={56} flipped />
            {awayHasPossession && <FootballIcon size={20} />}
          </Box>
          <Text
            variant={TextVariant.DisplayMd}
            color={TextColor.TextDefault}
            style={tw.style('font-bold mt-2')}
          >
            {showScores ? awayScore : `${getOddsPercentage(awayPrice ?? 0.5)}%`}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            twClassName="mt-1"
          >
            {game.awayTeam.alias}
          </Text>
        </Box>

        {/* VS divider */}
        <Box twClassName="items-center justify-center px-4">
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextMuted}
          >
            vs
          </Text>
        </Box>

        {/* Home team */}
        <Box twClassName="items-center flex-1">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-3"
          >
            {homeHasPossession && <FootballIcon size={20} />}
            <TeamHelmet color={game.homeTeam.color} size={56} />
          </Box>
          <Text
            variant={TextVariant.DisplayMd}
            color={TextColor.TextDefault}
            style={tw.style('font-bold mt-2')}
          >
            {showScores ? homeScore : `${getOddsPercentage(homePrice ?? 0.5)}%`}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            twClassName="mt-1"
          >
            {game.homeTeam.alias}
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

export default GameScoreboard;
```

**GameDetailsFooter.tsx:**

```typescript
import React, { useMemo } from 'react';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  PredictMarket,
  PredictMarketGame,
  PredictOutcomeToken,
} from '../../types';
import { useLiveMarketPrices } from '../../hooks/useLiveMarketPrices';
import { formatVolume } from '../../utils/format';
import { getOddsPercentage } from '../../utils/gameParser';

interface GameDetailsFooterProps {
  market: PredictMarket;
  game: PredictMarketGame;
  awayToken?: PredictOutcomeToken;
  homeToken?: PredictOutcomeToken;
  hasClaimablePosition: boolean;
  onBuyAway: () => void;
  onBuyHome: () => void;
  onClaim: () => void;
}

/**
 * Footer component that subscribes to live market prices.
 * Only THIS component re-renders when prices change.
 */
const GameDetailsFooter: React.FC<GameDetailsFooterProps> = ({
  market,
  game,
  awayToken,
  homeToken,
  hasClaimablePosition,
  onBuyAway,
  onBuyHome,
  onClaim,
}) => {
  const tw = useTailwind();
  const insets = useSafeAreaInsets();

  // Subscribe to live prices for both tokens
  const tokenIds = useMemo(
    () => [awayToken?.id, homeToken?.id].filter(Boolean) as string[],
    [awayToken?.id, homeToken?.id],
  );
  const { prices } = useLiveMarketPrices(tokenIds);

  const awayLivePrice = prices.get(awayToken?.id ?? '')?.price;
  const homeLivePrice = prices.get(homeToken?.id ?? '')?.price;

  const awayOdds = getOddsPercentage(awayLivePrice ?? awayToken?.price ?? 0.5);
  const homeOdds = getOddsPercentage(homeLivePrice ?? homeToken?.price ?? 0.5);

  // Show claim button for ended games with claimable positions
  if (game.status === 'ended' && hasClaimablePosition) {
    return (
      <Box
        twClassName="px-4 pt-3 bg-background-default border-t border-border-muted"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <Pressable
          onPress={onClaim}
          style={({ pressed }) =>
            tw.style(
              'w-full py-4 rounded-xl bg-white items-center justify-center',
              pressed && 'opacity-80',
            )
          }
        >
          <Text
            variant={TextVariant.BodyMd}
            style={tw.style('font-bold text-black')}
          >
            Claim winnings
          </Text>
        </Pressable>
      </Box>
    );
  }

  // Show betting buttons for non-ended games
  if (game.status !== 'ended') {
    return (
      <Box
        twClassName="px-4 pt-3 bg-background-default border-t border-border-muted"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        {/* Market info bar */}
        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
          twClassName="mb-3"
        >
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            Pick a winner
          </Text>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {formatVolume(market.volume)} Vol
          </Text>
        </Box>

        {/* Action buttons */}
        <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-3">
          <Pressable
            onPress={onBuyAway}
            style={({ pressed }) =>
              tw.style('flex-1', pressed && 'opacity-80')
            }
          >
            <Box
              twClassName="py-4 rounded-xl items-center justify-center"
              style={{ backgroundColor: game.awayTeam.color }}
            >
              <Text
                variant={TextVariant.BodyMd}
                style={tw.style('font-bold text-white')}
              >
                {game.awayTeam.abbreviation.toUpperCase()} {awayOdds}%
              </Text>
            </Box>
          </Pressable>

          <Pressable
            onPress={onBuyHome}
            style={({ pressed }) =>
              tw.style('flex-1', pressed && 'opacity-80')
            }
          >
            <Box
              twClassName="py-4 rounded-xl items-center justify-center"
              style={{ backgroundColor: game.homeTeam.color }}
            >
              <Text
                variant={TextVariant.BodyMd}
                style={tw.style('font-bold text-white')}
              >
                {game.homeTeam.abbreviation.toUpperCase()} {homeOdds}%
              </Text>
            </Box>
          </Pressable>
        </Box>
      </Box>
    );
  }

  // Ended game without claimable position - no footer actions
  return null;
};

export default GameDetailsFooter;
```

### 3. Unit Tests

**NOTE**: No new route registration needed. The existing MARKET_DETAILS route handles both game and non-game markets.

**PredictGameDetailsContent.test.tsx:**

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PredictGameDetailsContent from './PredictGameDetailsContent';
import { mockGameMarket, mockPosition } from '../../mocks/gameMarkets';

// Mock hooks
jest.mock('../../hooks/usePredictPriceHistory');
jest.mock('../../hooks/useLiveGameUpdates');
jest.mock('../../hooks/useLiveMarketPrices');
jest.mock('../../hooks/useLiveTokenPrice');

describe('PredictGameDetailsContent', () => {
  const defaultProps = {
    market: mockGameMarket({ status: 'ongoing' }),
    positions: [],
    onCashOut: jest.fn(),
    onClaim: jest.fn(),
    onBuy: jest.fn(),
    onBack: jest.fn(),
    onShare: jest.fn(),
    onRefresh: jest.fn(),
    refreshing: false,
    entryPoint: 'feed',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    require('../../hooks/usePredictPriceHistory').usePredictPriceHistory.mockReturnValue({
      priceHistory: [],
      isLoading: false,
    });

    require('../../hooks/useLiveGameUpdates').useLiveGameUpdates.mockReturnValue({
      gameUpdate: null,
      isConnected: true,
    });

    require('../../hooks/useLiveMarketPrices').useLiveMarketPrices.mockReturnValue({
      prices: new Map(),
      isConnected: true,
    });

    require('../../hooks/useLiveTokenPrice').useLiveTokenPrice.mockReturnValue({
      price: null,
      isConnected: true,
    });
  });

  it('renders game content', () => {
    const { getByText } = render(
      <PredictGameDetailsContent {...defaultProps} />
    );

    // Check team names are displayed
    expect(getByText(defaultProps.market.game!.awayTeam.alias)).toBeTruthy();
    expect(getByText(defaultProps.market.game!.homeTeam.alias)).toBeTruthy();
  });

  it('displays positions section when user has positions', () => {
    const positions = [mockPosition()];

    const { getByText } = render(
      <PredictGameDetailsContent {...defaultProps} positions={positions} />
    );

    expect(getByText('Your picks')).toBeTruthy();
  });

  it('displays claim button for ended game with claimable position', () => {
    const market = mockGameMarket({ status: 'ended' });
    const positions = [mockPosition({ isClaimable: true })];

    const { getByText } = render(
      <PredictGameDetailsContent
        {...defaultProps}
        market={market}
        positions={positions}
      />
    );

    expect(getByText('Claim winnings')).toBeTruthy();
  });

  it('calls onBuy when buy button is pressed', () => {
    const { getByText } = render(
      <PredictGameDetailsContent {...defaultProps} />
    );

    const awayTeamButton = getByText(
      new RegExp(defaultProps.market.game!.awayTeam.abbreviation),
    );
    fireEvent.press(awayTeamButton);

    expect(defaultProps.onBuy).toHaveBeenCalled();
  });
});
```

## Files to Create/Modify

| Action | File                                                                                                     |
| ------ | -------------------------------------------------------------------------------------------------------- |
| Create | `app/components/UI/Predict/components/PredictGameDetailsContent/PredictGameDetailsContent.tsx`           |
| Create | `app/components/UI/Predict/components/PredictGameDetailsContent/PredictGameDetailsContent.test.tsx`      |
| Create | `app/components/UI/Predict/components/PredictGameDetailsContent/GameScoreboard.tsx`                      |
| Create | `app/components/UI/Predict/components/PredictGameDetailsContent/GameDetailsFooter.tsx`                   |
| Create | `app/components/UI/Predict/components/PredictGameDetailsContent/index.ts`                                |
| Modify | `app/components/UI/Predict/views/PredictMarketDetails/PredictMarketDetails.tsx` (add conditional render) |

**NOTE**: No new routes or navigation changes needed.

## Acceptance Criteria

- [ ] `PredictGameDetailsContent` renders inside `PredictMarketDetails` when `market.game` exists
- [ ] **GameScoreboard subscribes to `useLiveGameUpdates`** - live score updates work
- [ ] **GameDetailsFooter subscribes to `useLiveMarketPrices`** - live odds update
- [ ] **Each position row subscribes to `useLiveTokenPrice`** - P&L updates independently
- [ ] Chart displays price history with timeframe selection
- [ ] Positions section shows when user has positions
- [ ] Buy buttons navigate to buy flow
- [ ] Claim button appears for claimable positions
- [ ] Pull-to-refresh works
- [ ] Dark/light mode supported
- [ ] **NO new routes added** - existing MARKET_DETAILS handles both
- [ ] All unit tests pass

## Estimated Effort

10-12 hours

## Assignee

Developer C (UI - Details Screen Track)
