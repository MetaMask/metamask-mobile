# Task 00: Feature Flag and Data Types

## Description

Set up the feature flag for Live NFL and define all necessary TypeScript types for game data. This is a foundational task that unblocks all other work.

## Requirements

- Add `predictLiveNflEnabled` feature flag selector
- Add `MM_PREDICT_LIVE_NFL_ENABLED` environment variable support
- Define all game-related TypeScript types
- Update navigation types for game details screen
- All code must have unit tests

## Dependencies

- None (this is a foundational task)

## Designs

- N/A (infrastructure task)

## Implementation

### 1. Feature Flag Selector

Create/update `app/components/UI/Predict/selectors/featureFlags/index.ts`:

```typescript
/**
 * Selector for Predict Live NFL feature enablement
 */
export const selectPredictLiveNflEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const localFlag = process.env.MM_PREDICT_LIVE_NFL_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.predictLiveNflEnabled as unknown as VersionGatedFeatureFlag;
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);
```

### 2. Data Types

Add to `app/components/UI/Predict/types/index.ts`:

```typescript
// Sports league types
export type PredictSportsLeague = 'nfl';

// Game status
export type PredictGameStatus = 'scheduled' | 'ongoing' | 'ended';

// Team data
export interface PredictSportTeam {
  id: string;
  name: string;
  logo: string;
  abbreviation: string; // e.g., "SEA", "DEN"
  color: string; // Team primary color (hex)
  alias: string; // Team alias (e.g., "Seahawks")
}

// Game data attached to market
export interface PredictMarketGame {
  id: string;
  startTime: string;
  status: PredictGameStatus;
  league: PredictSportsLeague;
  elapsed: string; // Game clock
  period: string; // Current period (Q1, Q2, HT, Q3, Q4, OT, FT)
  score: string; // "away-home" format (e.g., "21-14")
  homeTeam: PredictSportTeam;
  awayTeam: PredictSportTeam;
  turn?: string; // Team abbreviation with possession
}

// Live update types for WebSocket data
export interface GameUpdate {
  gameId: string;
  score: string;
  elapsed: string;
  period: string;
  status: PredictGameStatus;
  turn?: string;
}

export interface PriceUpdate {
  tokenId: string;
  price: number;
  bestBid: number;
  bestAsk: number;
}
```

### 3. Update PredictMarket Type

Extend the existing `PredictMarket` type:

```typescript
export interface PredictMarket {
  // ... existing fields
  game?: PredictMarketGame; // Optional game data for sports markets
}
```

### 4. Navigation Types

Update `app/components/UI/Predict/types/navigation.ts`:

```typescript
// Add to navigation params
export type PredictNavigationParamList = {
  // ... existing routes
  [Routes.PREDICT.GAME_DETAILS]: {
    marketId: string;
    entryPoint?: PredictEntryPoint;
  };
};

// Update market details params
export type PredictMarketDetailsParams = {
  marketId?: string;
  entryPoint?: PredictEntryPoint;
  title?: string;
  image?: string;
  isGame?: boolean; // NEW: indicates if this is a game market
};
```

### 5. Provider Types

Add to `app/components/UI/Predict/providers/polymarket/types.ts`:

```typescript
// Team data from Polymarket API
export interface PolymarketApiTeam {
  id: string;
  name: string;
  logo: string;
  abbreviation: string;
  color: string;
  alias: string;
}

// Game event data from Polymarket API
export interface PolymarketApiGameEvent {
  gameId?: string;
  startTime?: string;
  score?: string;
  elapsed?: string;
  period?: string;
  live?: boolean;
  ended?: boolean;
  closed?: boolean;
}
```

### 6. Unit Tests

Create `app/components/UI/Predict/selectors/featureFlags/index.test.ts`:

```typescript
import { selectPredictLiveNflEnabled } from './index';

describe('selectPredictLiveNflEnabled', () => {
  const baseState = {
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          remoteFeatureFlags: {},
        },
      },
    },
  };

  beforeEach(() => {
    jest.resetModules();
  });

  it('returns false when remote flag is not set and local flag is false', () => {
    process.env.MM_PREDICT_LIVE_NFL_ENABLED = 'false';
    const result = selectPredictLiveNflEnabled(baseState);
    expect(result).toBe(false);
  });

  it('returns true when local flag is true and remote flag is not set', () => {
    process.env.MM_PREDICT_LIVE_NFL_ENABLED = 'true';
    const result = selectPredictLiveNflEnabled(baseState);
    expect(result).toBe(true);
  });

  it('returns true when remote flag is enabled with valid version', () => {
    const state = {
      ...baseState,
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              predictLiveNflEnabled: {
                enabled: true,
                minimumVersion: '1.0.0',
              },
            },
          },
        },
      },
    };
    const result = selectPredictLiveNflEnabled(state);
    expect(result).toBe(true);
  });
});
```

## Files to Create/Modify

| Action | File                                                             |
| ------ | ---------------------------------------------------------------- |
| Modify | `app/components/UI/Predict/selectors/featureFlags/index.ts`      |
| Modify | `app/components/UI/Predict/selectors/featureFlags/index.test.ts` |
| Modify | `app/components/UI/Predict/types/index.ts`                       |
| Modify | `app/components/UI/Predict/types/navigation.ts`                  |
| Modify | `app/components/UI/Predict/providers/polymarket/types.ts`        |

## Acceptance Criteria

- [ ] Feature flag selector is implemented and tested
- [ ] All game-related types are defined
- [ ] Navigation types support game details routing
- [ ] Provider types include Polymarket game event data
- [ ] All unit tests pass
- [ ] No TypeScript errors

## Estimated Effort

2-3 hours

## Assignee

Any developer (foundation task - do first or in parallel)
