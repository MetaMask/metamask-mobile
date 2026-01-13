# Task 07: PredictGamePosition Component

## Description

Create a new position component specifically designed for NFL game markets. This component displays user positions with team-specific styling, live P&L updates, and cash-out functionality.

## Requirements

- Display position with team color indicator
- Show bet amount, team, and current P&L
- **Each position row subscribes to its own token price** (granular subscriptions)
- Cash-out button for active positions
- Claim button for resolved winning positions
- Dark/light mode support
- Unit tests

## Granular Subscription Pattern

**IMPORTANT**: Each `PredictGamePosition` component subscribes to its own token's price updates using `useLiveTokenPrice(tokenId)`. This ensures that when a price update comes in, ONLY that specific position row re-renders - not the entire positions list or parent components.

```
PredictGamePositionsSection
  +-- PredictGamePosition (token1) → useLiveTokenPrice('token1')
  +-- PredictGamePosition (token2) → useLiveTokenPrice('token2')
```

When token1's price updates, only the first row re-renders. Token2's row is unaffected.

## Dependencies

- Task 00: Feature Flag and Data Types
- Task 02: Live Data Hooks
- Task 03: UI Primitives

## Designs

- @nfl-details-page-variations.png - "Your picks" section showing position rows

### Design Specifications

**Position Row Layout:**

- Left: Team color dot + "$X on TEAM to win"
- Right: P&L value (green +$X.XX or red -$X.XX) + "Cash out" button

**States:**

- Active with profit: Green P&L, enabled cash-out
- Active with loss: Red P&L, enabled cash-out
- Resolved winner: "WIN" label, "Claim" button
- Resolved loser: "LOSE" label, grayed out

## Implementation

### 1. Component Structure

Create `app/components/UI/Predict/components/PredictGamePosition/`:

**PredictGamePosition.types.ts:**

```typescript
import { PredictPosition, PredictMarketGame } from '../../types';

export interface PredictGamePositionProps {
  position: PredictPosition;
  game: PredictMarketGame;
  // NOTE: NO livePrice prop - each row subscribes to its own token
  onCashOut?: (position: PredictPosition) => void;
  onClaim?: (position: PredictPosition) => void;
  testID?: string;
}
```

**PredictGamePosition.tsx:**

```typescript
import React, { useMemo } from 'react';
import { Pressable } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { PredictGamePositionProps } from './PredictGamePosition.types';
import { useLiveTokenPrice } from '../../hooks/useLiveTokenPrice';

const PredictGamePosition: React.FC<PredictGamePositionProps> = ({
  position,
  game,
  onCashOut,
  onClaim,
  testID,
}) => {
  const tw = useTailwind();

  // Subscribe to THIS position's token price only
  // This ensures only this row re-renders when price updates
  const { price: livePrice } = useLiveTokenPrice(position.tokenId);

  // Determine which team the position is for
  const isAwayTeam = position.outcomeIndex === 0;
  const team = isAwayTeam ? game.awayTeam : game.homeTeam;
  const teamColor = team.color;

  // Calculate current value and P&L
  const currentPrice = livePrice?.price ?? position.currentPrice ?? position.avgPrice;
  const currentValue = position.size * currentPrice;
  const pnl = currentValue - position.initialValue;
  const pnlPercentage = position.initialValue > 0
    ? (pnl / position.initialValue) * 100
    : 0;

  // Determine position state
  const isResolved = game.status === 'ended';
  const isWinner = isResolved && position.isClaimable;
  const isLoser = isResolved && !position.isClaimable;

  // Format P&L display
  const formatPnl = (value: number): string => {
    const absValue = Math.abs(value);
    const formatted = absValue < 0.01 ? absValue.toFixed(3) : absValue.toFixed(2);
    const prefix = value >= 0 ? '+$' : '-$';
    return `${prefix}${formatted}`;
  };

  const pnlColor = useMemo(() => {
    if (isLoser) return TextColor.TextMuted;
    if (pnl >= 0) return TextColor.SuccessDefault;
    return TextColor.ErrorDefault;
  }, [pnl, isLoser]);

  const renderActionButton = () => {
    if (isWinner && onClaim) {
      return (
        <Pressable
          onPress={() => onClaim(position)}
          style={({ pressed }) =>
            tw.style(
              'px-4 py-2 rounded-lg bg-success-default',
              pressed && 'opacity-80',
            )
          }
        >
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextInverse}
            style={tw.style('font-medium')}
          >
            Claim
          </Text>
        </Pressable>
      );
    }

    if (!isResolved && onCashOut) {
      return (
        <Pressable
          onPress={() => onCashOut(position)}
          style={({ pressed }) =>
            tw.style(
              'px-4 py-2 rounded-lg bg-background-alternative',
              pressed && 'opacity-80',
            )
          }
        >
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextDefault}
            style={tw.style('font-medium')}
          >
            Cash out
          </Text>
        </Pressable>
      );
    }

    return null;
  };

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="py-3"
      testID={testID}
    >
      {/* Left side: Team indicator and bet info */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-3 flex-1"
      >
        {/* Team color dot */}
        <Box
          twClassName="w-3 h-3 rounded-full"
          style={{ backgroundColor: teamColor }}
        />

        {/* Bet details */}
        <Box twClassName="flex-1">
          {isResolved ? (
            <Text
              variant={TextVariant.BodyMd}
              color={isWinner ? TextColor.SuccessDefault : TextColor.TextMuted}
              style={tw.style('font-bold')}
            >
              {isWinner ? 'WIN' : 'LOSE'}
            </Text>
          ) : (
            <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
              ${position.initialValue.toFixed(2)} on{' '}
              <Text style={tw.style('font-medium')}>
                {team.abbreviation.toUpperCase()}
              </Text>{' '}
              to win
            </Text>
          )}

          {/* P&L */}
          {!isLoser && (
            <Text
              variant={TextVariant.BodySm}
              color={pnlColor}
              style={tw.style('font-medium')}
            >
              {formatPnl(pnl)} ({pnlPercentage >= 0 ? '+' : ''}{pnlPercentage.toFixed(1)}%)
            </Text>
          )}
        </Box>
      </Box>

      {/* Right side: Action button */}
      {renderActionButton()}
    </Box>
  );
};

export default PredictGamePosition;
```

### 2. Positions Section Component

**PredictGamePositionsSection.tsx:**

```typescript
import React from 'react';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { PredictPosition, PredictMarketGame } from '../../types';
import PredictGamePosition from './PredictGamePosition';

interface PredictGamePositionsSectionProps {
  positions: PredictPosition[];
  game: PredictMarketGame;
  // NOTE: NO livePrices prop - each row subscribes to its own token
  onCashOut?: (position: PredictPosition) => void;
  onClaim?: (position: PredictPosition) => void;
  testID?: string;
}

/**
 * Container for position rows.
 * Does NOT pass price data down - each PredictGamePosition
 * subscribes to its own token price for optimal re-render performance.
 */
const PredictGamePositionsSection: React.FC<PredictGamePositionsSectionProps> = ({
  positions,
  game,
  onCashOut,
  onClaim,
  testID,
}) => {
  const tw = useTailwind();

  if (positions.length === 0) {
    return null;
  }

  return (
    <Box twClassName="mt-4" testID={testID}>
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        style={tw.style('font-medium mb-2')}
      >
        Your picks
      </Text>

      {positions.map((position, index) => (
        <React.Fragment key={position.id}>
          <PredictGamePosition
            position={position}
            game={game}
            onCashOut={onCashOut}
            onClaim={onClaim}
            testID={`${testID}-position-${index}`}
          />
          {index < positions.length - 1 && (
            <Box twClassName="h-px bg-border-muted" />
          )}
        </React.Fragment>
      ))}
    </Box>
  );
};

export default PredictGamePositionsSection;
```

### 3. Unit Tests

**PredictGamePosition.test.tsx:**

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PredictGamePosition from './PredictGamePosition';
import { mockPosition, mockGame } from '../../mocks/gameMarkets';

describe('PredictGamePosition', () => {
  const defaultGame = mockGame({
    status: 'ongoing',
    awayTeam: { abbreviation: 'SEA', color: '#002244' },
    homeTeam: { abbreviation: 'DEN', color: '#FB4F14' },
  });

  describe('active position', () => {
    it('renders bet amount and team', () => {
      const position = mockPosition({
        outcomeIndex: 0,
        initialValue: 25,
      });

      const { getByText } = render(
        <PredictGamePosition
          position={position}
          game={defaultGame}
        />
      );

      expect(getByText(/\$25.00 on/)).toBeTruthy();
      expect(getByText('SEA')).toBeTruthy();
    });

    it('renders positive P&L in green', () => {
      const position = mockPosition({
        initialValue: 25,
        size: 50,
        currentPrice: 0.6, // 50 * 0.6 = 30, profit of 5
      });

      const { getByText } = render(
        <PredictGamePosition
          position={position}
          game={defaultGame}
        />
      );

      expect(getByText(/\+\$/)).toBeTruthy();
    });

    it('renders negative P&L in red', () => {
      const position = mockPosition({
        initialValue: 25,
        size: 50,
        currentPrice: 0.4, // 50 * 0.4 = 20, loss of 5
      });

      const { getByText } = render(
        <PredictGamePosition
          position={position}
          game={defaultGame}
        />
      );

      expect(getByText(/-\$/)).toBeTruthy();
    });

    it('renders cash out button', () => {
      const onCashOut = jest.fn();
      const position = mockPosition();

      const { getByText } = render(
        <PredictGamePosition
          position={position}
          game={defaultGame}
          onCashOut={onCashOut}
        />
      );

      expect(getByText('Cash out')).toBeTruthy();
    });

    it('calls onCashOut when button is pressed', () => {
      const onCashOut = jest.fn();
      const position = mockPosition();

      const { getByText } = render(
        <PredictGamePosition
          position={position}
          game={defaultGame}
          onCashOut={onCashOut}
        />
      );

      fireEvent.press(getByText('Cash out'));

      expect(onCashOut).toHaveBeenCalledWith(position);
    });
  });

  describe('resolved winning position', () => {
    it('renders WIN label', () => {
      const position = mockPosition({ isClaimable: true });
      const game = mockGame({ status: 'ended' });

      const { getByText } = render(
        <PredictGamePosition
          position={position}
          game={game}
        />
      );

      expect(getByText('WIN')).toBeTruthy();
    });

    it('renders Claim button', () => {
      const onClaim = jest.fn();
      const position = mockPosition({ isClaimable: true });
      const game = mockGame({ status: 'ended' });

      const { getByText } = render(
        <PredictGamePosition
          position={position}
          game={game}
          onClaim={onClaim}
        />
      );

      expect(getByText('Claim')).toBeTruthy();
    });
  });

  describe('resolved losing position', () => {
    it('renders LOSE label', () => {
      const position = mockPosition({ isClaimable: false });
      const game = mockGame({ status: 'ended' });

      const { getByText } = render(
        <PredictGamePosition
          position={position}
          game={game}
        />
      );

      expect(getByText('LOSE')).toBeTruthy();
    });

    it('does not render action button', () => {
      const position = mockPosition({ isClaimable: false });
      const game = mockGame({ status: 'ended' });

      const { queryByText } = render(
        <PredictGamePosition
          position={position}
          game={game}
        />
      );

      expect(queryByText('Cash out')).toBeNull();
      expect(queryByText('Claim')).toBeNull();
    });
  });

  describe('live price updates', () => {
    it('subscribes to token price and updates P&L', () => {
      // Mock useLiveTokenPrice to return a specific price
      jest.mock('../../hooks/useLiveTokenPrice', () => ({
        useLiveTokenPrice: (tokenId: string) => ({
          price: { tokenId, price: 0.7, bestBid: 0.69, bestAsk: 0.71 },
          isConnected: true,
        }),
      }));

      const position = mockPosition({
        tokenId: 'token1',
        initialValue: 25,
        size: 50,
        currentPrice: 0.5,
      });

      const { getByText } = render(
        <PredictGamePosition
          position={position}
          game={defaultGame}
        />
      );

      // Live price of 0.7: 50 * 0.7 = 35, profit of 10
      expect(getByText(/\+\$10/)).toBeTruthy();
    });
  });
});
```

## Files to Create

| Action | File                                                                                       |
| ------ | ------------------------------------------------------------------------------------------ |
| Create | `app/components/UI/Predict/components/PredictGamePosition/PredictGamePosition.tsx`         |
| Create | `app/components/UI/Predict/components/PredictGamePosition/PredictGamePosition.types.ts`    |
| Create | `app/components/UI/Predict/components/PredictGamePosition/PredictGamePosition.test.tsx`    |
| Create | `app/components/UI/Predict/components/PredictGamePosition/PredictGamePositionsSection.tsx` |
| Create | `app/components/UI/Predict/components/PredictGamePosition/index.ts`                        |

## Acceptance Criteria

- [ ] Position displays bet amount and team
- [ ] Team color indicator matches team
- [ ] P&L updates with live price data
- [ ] Positive P&L shown in green
- [ ] Negative P&L shown in red
- [ ] Cash out button works for active positions
- [ ] Claim button works for winning positions
- [ ] LOSE state shown correctly for losing positions
- [ ] Dark/light mode supported
- [ ] All unit tests pass

## Estimated Effort

4-6 hours

## Assignee

Developer C (UI - Details Screen Track)
