# Task 04: PredictMarketGame Card Component

## Description

Create the `PredictMarketGame` card component that displays NFL game markets in the feed. This card has different visual states based on game status (scheduled, ongoing, ended) and user state (has bet, no bet).

## Requirements

- Display game info: teams, scores, status, odds
- Support all game states: scheduled, ongoing, ended
- Support user states: no bet (show odds buttons), has bet (show position)
- Dynamic gradient background from team colors
- Navigate to game details on card press
- Navigate to buy flow on team button press
- Show "Claim winnings" button for ended games with claimable positions
- All code must have unit tests

## Dependencies

- Task 00: Feature Flag and Data Types
- Task 03: UI Primitives (TeamHelmet, TeamGradient, gameParser)

## Designs

- @nfl-card-variations.png - All card state variations

### Design Specifications

**Card States:**

1. **Pre-game (No bet)**: Shows date/time, team abbreviations, odds buttons
2. **Pre-game (Has bet)**: Shows date/time, position details
3. **In-progress (No bet)**: Shows live score, period/clock, odds buttons
4. **In-progress (Has bet)**: Shows live score, position with P&L
5. **Halftime/Delayed**: Same as in-progress with status text
6. **Final (No bet)**: Shows WIN/LOSE labels, final score
7. **Final (Has bet)**: Shows result, P&L, "Claim winnings" button

**Layout:**

- Header: Event name centered
- Body: Team helmets on sides, game info in center
- Footer: Action buttons or position details

## Implementation

### 1. Component Structure

Create `app/components/UI/Predict/components/PredictMarketGame/`:

**PredictMarketGame.types.ts:**

```typescript
import { PredictMarket, PredictPosition, PredictEntryPoint } from '../../types';

export interface PredictMarketGameProps {
  market: PredictMarket;
  position?: PredictPosition;
  testID?: string;
  entryPoint?: PredictEntryPoint;
  isCarousel?: boolean;
}
```

**PredictMarketGame.tsx:**

```typescript
import React from 'react';
import { Pressable, View } from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
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
import Routes from '../../../../../constants/navigation/Routes';
import { usePredictActionGuard } from '../../hooks/usePredictActionGuard';
import {
  PredictMarket,
  PredictOutcomeToken,
  PredictMarketGame as PredictMarketGameType,
  PredictPosition,
} from '../../types';
import {
  PredictNavigationParamList,
  PredictEntryPoint,
} from '../../types/navigation';
import { PredictEventValues } from '../../constants/eventNames';
import TeamHelmet from '../TeamHelmet';
import TeamGradient from '../TeamGradient';
import {
  formatPeriodDisplay,
  formatScheduledTime,
  parseScore,
  getOddsPercentage,
} from '../../utils/gameParser';
import { PredictMarketGameProps } from './PredictMarketGame.types';
import ScheduledContent from './ScheduledContent';
import OngoingContent from './OngoingContent';
import EndedContent from './EndedContent';
import PositionPreview from './PositionPreview';

const PredictMarketGame: React.FC<PredictMarketGameProps> = ({
  market,
  position,
  testID,
  entryPoint = PredictEventValues.ENTRY_POINT.PREDICT_FEED,
  isCarousel = false,
}) => {
  const tw = useTailwind();
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();

  const { executeGuardedAction } = usePredictActionGuard({
    providerId: market.providerId,
    navigation,
  });

  const game = market.game;
  if (!game) {
    return null;
  }

  const outcome = market.outcomes[0];
  if (!outcome || outcome.tokens.length < 2) {
    return null;
  }

  const awayToken = outcome.tokens[0];
  const homeToken = outcome.tokens[1];

  const handleBuy = (token: PredictOutcomeToken) => {
    executeGuardedAction(
      () => {
        navigation.navigate(Routes.PREDICT.ROOT, {
          screen: Routes.PREDICT.MODALS.BUY_PREVIEW,
          params: {
            market,
            outcome,
            outcomeToken: token,
            entryPoint,
          },
        });
      },
      {
        checkBalance: true,
        attemptedAction: PredictEventValues.ATTEMPTED_ACTION.PREDICT,
      },
    );
  };

  const handleCardPress = () => {
    navigation.navigate(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.GAME_DETAILS,
      params: {
        marketId: market.id,
        entryPoint,
      },
    });
  };

  const handleClaim = () => {
    // Navigate to claim flow
    navigation.navigate(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MODALS.CLAIM,
      params: {
        marketId: market.id,
        entryPoint,
      },
    });
  };

  const renderContent = () => {
    // If user has position and game is ended, show claim UI
    if (position && game.status === 'ended') {
      return (
        <EndedContent
          game={game}
          position={position}
          onClaim={handleClaim}
        />
      );
    }

    // If user has position, show position preview
    if (position) {
      return (
        <PositionPreview
          game={game}
          position={position}
          awayToken={awayToken}
          homeToken={homeToken}
        />
      );
    }

    // No position - show betting UI
    switch (game.status) {
      case 'scheduled':
        return (
          <ScheduledContent
            game={game}
            awayToken={awayToken}
            homeToken={homeToken}
            onBuyAway={() => handleBuy(awayToken)}
            onBuyHome={() => handleBuy(homeToken)}
          />
        );
      case 'ongoing':
        return (
          <OngoingContent
            game={game}
            awayToken={awayToken}
            homeToken={homeToken}
            onBuyAway={() => handleBuy(awayToken)}
            onBuyHome={() => handleBuy(homeToken)}
          />
        );
      case 'ended':
        return <EndedContent game={game} />;
      default:
        return null;
    }
  };

  return (
    <Pressable testID={testID} onPress={handleCardPress}>
      {({ pressed }) => (
        <View
          style={tw.style(
            `w-full rounded-2xl overflow-hidden ${isCarousel ? 'h-full' : 'my-2'}`,
            pressed && 'opacity-90',
          )}
        >
          <TeamGradient
            awayColor={game.awayTeam.color}
            homeColor={game.homeTeam.color}
          />
          <Box twClassName="p-4 bg-background-default/80 rounded-2xl">
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextDefault}
              style={tw.style('text-center font-medium mb-1')}
            >
              {market.title}
            </Text>

            {renderContent()}
          </Box>
        </View>
      )}
    </Pressable>
  );
};

export default PredictMarketGame;
```

### 2. Sub-components

**ScheduledContent.tsx:**

```typescript
import React from 'react';
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
import TeamHelmet from '../TeamHelmet';
import { PredictMarketGame, PredictOutcomeToken } from '../../types';
import { formatScheduledTime, getOddsPercentage } from '../../utils/gameParser';

interface ScheduledContentProps {
  game: PredictMarketGame;
  awayToken: PredictOutcomeToken;
  homeToken: PredictOutcomeToken;
  onBuyAway: () => void;
  onBuyHome: () => void;
}

const ScheduledContent: React.FC<ScheduledContentProps> = ({
  game,
  awayToken,
  homeToken,
  onBuyAway,
  onBuyHome,
}) => {
  const tw = useTailwind();
  const { date, time } = formatScheduledTime(game.startTime);
  const awayOdds = getOddsPercentage(awayToken.price);
  const homeOdds = getOddsPercentage(homeToken.price);

  return (
    <>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="w-full py-3"
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-3"
        >
          <TeamHelmet color={game.awayTeam.color} size={48} flipped />
          <Text
            variant={TextVariant.HeadingMd}
            color={TextColor.TextDefault}
            style={tw.style('font-bold')}
          >
            {game.awayTeam.abbreviation.toUpperCase()}
          </Text>
        </Box>

        <Box twClassName="items-center">
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            style={tw.style('text-center')}
          >
            {date}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            style={tw.style('text-center')}
          >
            {time}
          </Text>
        </Box>

        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-3"
        >
          <Text
            variant={TextVariant.HeadingMd}
            color={TextColor.TextDefault}
            style={tw.style('font-bold')}
          >
            {game.homeTeam.abbreviation.toUpperCase()}
          </Text>
          <TeamHelmet color={game.homeTeam.color} size={48} />
        </Box>
      </Box>

      <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-3 mt-2">
        <Pressable onPress={onBuyAway} style={tw.style('flex-1')}>
          {({ pressed }) => (
            <Box
              twClassName="py-3 rounded-xl items-center justify-center"
              style={{
                backgroundColor: game.awayTeam.color,
                opacity: pressed ? 0.8 : 1,
              }}
            >
              <Text
                variant={TextVariant.BodyMd}
                style={tw.style('font-bold text-white')}
              >
                {game.awayTeam.abbreviation.toUpperCase()} {awayOdds}%
              </Text>
            </Box>
          )}
        </Pressable>
        <Pressable onPress={onBuyHome} style={tw.style('flex-1')}>
          {({ pressed }) => (
            <Box
              twClassName="py-3 rounded-xl items-center justify-center"
              style={{
                backgroundColor: game.homeTeam.color,
                opacity: pressed ? 0.8 : 1,
              }}
            >
              <Text
                variant={TextVariant.BodyMd}
                style={tw.style('font-bold text-white')}
              >
                {game.homeTeam.abbreviation.toUpperCase()} {homeOdds}%
              </Text>
            </Box>
          )}
        </Pressable>
      </Box>
    </>
  );
};

export default ScheduledContent;
```

Create similar files for:

- `OngoingContent.tsx` - Shows live scores, period, odds buttons
- `EndedContent.tsx` - Shows WIN/LOSE, claim button if applicable
- `PositionPreview.tsx` - Shows user's position details on card

### 3. Unit Tests

**PredictMarketGame.test.tsx:**

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PredictMarketGame from './PredictMarketGame';
import { mockGameMarket, mockPosition } from '../../mocks/gameMarkets';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

// Mock hooks
jest.mock('../../hooks/usePredictActionGuard', () => ({
  usePredictActionGuard: () => ({
    executeGuardedAction: (fn: Function) => fn(),
  }),
}));

describe('PredictMarketGame', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('scheduled game', () => {
    it('renders date and time', () => {
      const market = mockGameMarket({ status: 'scheduled' });
      const { getByText } = render(<PredictMarketGame market={market} />);

      expect(getByText(/Sun, Feb/)).toBeTruthy();
    });

    it('renders team abbreviations', () => {
      const market = mockGameMarket({ status: 'scheduled' });
      const { getByText } = render(<PredictMarketGame market={market} />);

      expect(getByText('SEA')).toBeTruthy();
      expect(getByText('DEN')).toBeTruthy();
    });

    it('navigates to buy flow on team button press', () => {
      const market = mockGameMarket({ status: 'scheduled' });
      const { getByText } = render(<PredictMarketGame market={market} />);

      fireEvent.press(getByText(/SEA.*%/));

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          screen: expect.stringContaining('BUY'),
        }),
      );
    });
  });

  describe('ongoing game', () => {
    it('renders live score', () => {
      const market = mockGameMarket({
        status: 'ongoing',
        score: '21-14',
      });
      const { getByText } = render(<PredictMarketGame market={market} />);

      expect(getByText('21')).toBeTruthy();
      expect(getByText('14')).toBeTruthy();
    });

    it('renders period', () => {
      const market = mockGameMarket({
        status: 'ongoing',
        period: 'Q3',
      });
      const { getByText } = render(<PredictMarketGame market={market} />);

      expect(getByText(/Q3/)).toBeTruthy();
    });
  });

  describe('ended game', () => {
    it('renders WIN/LOSE labels', () => {
      const market = mockGameMarket({
        status: 'ended',
        score: '28-21',
      });
      const { getByText } = render(<PredictMarketGame market={market} />);

      expect(getByText('WIN')).toBeTruthy();
      expect(getByText('LOSE')).toBeTruthy();
    });

    it('renders claim button when user has claimable position', () => {
      const market = mockGameMarket({ status: 'ended' });
      const position = mockPosition({ isClaimable: true });

      const { getByText } = render(
        <PredictMarketGame market={market} position={position} />
      );

      expect(getByText('Claim winnings')).toBeTruthy();
    });
  });

  describe('with position', () => {
    it('renders position details instead of odds', () => {
      const market = mockGameMarket({ status: 'ongoing' });
      const position = mockPosition({ cashPnl: 5.42 });

      const { getByText, queryByText } = render(
        <PredictMarketGame market={market} position={position} />
      );

      expect(getByText(/\+\$5.42/)).toBeTruthy();
      expect(queryByText(/SEA.*%/)).toBeNull(); // No odds button
    });
  });

  it('navigates to game details on card press', () => {
    const market = mockGameMarket({ status: 'ongoing' });
    const { getByTestId } = render(
      <PredictMarketGame market={market} testID="game-card" />
    );

    fireEvent.press(getByTestId('game-card'));

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        screen: expect.stringContaining('GAME_DETAILS'),
      }),
    );
  });
});
```

## Files to Create

| Action | File                                                                                |
| ------ | ----------------------------------------------------------------------------------- |
| Create | `app/components/UI/Predict/components/PredictMarketGame/PredictMarketGame.tsx`      |
| Create | `app/components/UI/Predict/components/PredictMarketGame/PredictMarketGame.types.ts` |
| Create | `app/components/UI/Predict/components/PredictMarketGame/PredictMarketGame.test.tsx` |
| Create | `app/components/UI/Predict/components/PredictMarketGame/ScheduledContent.tsx`       |
| Create | `app/components/UI/Predict/components/PredictMarketGame/OngoingContent.tsx`         |
| Create | `app/components/UI/Predict/components/PredictMarketGame/EndedContent.tsx`           |
| Create | `app/components/UI/Predict/components/PredictMarketGame/PositionPreview.tsx`        |
| Create | `app/components/UI/Predict/components/PredictMarketGame/index.ts`                   |
| Create | `app/components/UI/Predict/mocks/gameMarkets.ts`                                    |
| Modify | `app/components/UI/Predict/components/PredictMarket/PredictMarket.tsx`              |

## Acceptance Criteria

- [ ] Card renders correctly for scheduled games
- [ ] Card renders correctly for ongoing games (live score, period)
- [ ] Card renders correctly for ended games (WIN/LOSE)
- [ ] Odds buttons navigate to buy flow
- [ ] Card press navigates to game details
- [ ] Position preview shows when user has position
- [ ] Claim button shows for claimable positions
- [ ] Gradient background applies team colors
- [ ] Dark/light mode supported
- [ ] All unit tests pass

## Estimated Effort

8-10 hours

## Assignee

Developer B (UI - Card & Feed Track)
