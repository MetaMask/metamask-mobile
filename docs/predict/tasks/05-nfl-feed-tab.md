# Task 05: NFL Feed Tab

## Description

Add a new "NFL" tab to the Predict feed that shows all markets with the `nfl` tag, sorted by 24-hour volume. This requires updating the feed categories and the market data fetching logic.

## Requirements

- Add "NFL" category to feed tabs
- Fetch NFL markets filtered by tag
- Sort NFL markets by 24h volume (descending)
- Gate behind feature flag
- Integrate with existing feed infrastructure
- Unit tests

## Dependencies

- Task 00: Feature Flag and Data Types
- Task 04: PredictMarketGame Card Component

## Designs

- NFL tab shows same card UI as main feed, but filtered to NFL games only

## Implementation

### 1. Update Feed Categories

Update `app/components/UI/Predict/constants/feed.ts` (or create if doesn't exist):

```typescript
export const FEED_CATEGORIES = [
  'trending',
  'new',
  'sports',
  'crypto',
  'politics',
] as const;

export const FEED_CATEGORIES_WITH_NFL = [...FEED_CATEGORIES, 'nfl'] as const;

export type FeedCategory = (typeof FEED_CATEGORIES)[number];
export type FeedCategoryWithNfl = (typeof FEED_CATEGORIES_WITH_NFL)[number];

export const CATEGORY_LABELS: Record<FeedCategoryWithNfl, string> = {
  trending: 'Trending',
  new: 'New',
  sports: 'Sports',
  crypto: 'Crypto',
  politics: 'Politics',
  nfl: 'NFL',
};
```

### 2. Update Market Data Hook

Modify `app/components/UI/Predict/hooks/usePredictMarketData.tsx` to support NFL category:

```typescript
import { useSelector } from 'react-redux';
import { selectPredictLiveNflEnabled } from '../selectors/featureFlags';

// In the hook parameters
interface UsePredictMarketDataParams {
  category?: FeedCategoryWithNfl;
  // ... existing params
}

// In the fetch logic
const fetchMarkets = useCallback(async () => {
  const params: GetMarketsParams = {
    // ... existing params
  };

  // Handle NFL category specially
  if (category === 'nfl') {
    params.tags = ['nfl'];
    params.sortBy = 'volume24h';
    params.sortOrder = 'desc';
  } else if (category) {
    params.category = category;
  }

  const markets = await controller.getMarkets(params);
  return markets;
}, [category /* other deps */]);
```

### 3. Update Provider/Controller for Tag Filtering

Update `app/components/UI/Predict/providers/types.ts`:

```typescript
export interface GetMarketsParams {
  // ... existing params
  tags?: string[];
  sortBy?: 'volume24h' | 'createdAt' | 'endDate';
  sortOrder?: 'asc' | 'desc';
}
```

Update `app/components/UI/Predict/providers/polymarket/PolymarketProvider.ts` to handle tag filtering:

```typescript
async getMarkets(params: GetMarketsParams): Promise<PredictMarket[]> {
  const { tags, sortBy, sortOrder, ...otherParams } = params;

  // Build API query params
  const queryParams: any = {
    ...otherParams,
  };

  if (tags && tags.length > 0) {
    queryParams.tag_slug = tags.join(',');
  }

  if (sortBy === 'volume24h') {
    queryParams.order = 'volume24hr';
    queryParams.ascending = sortOrder === 'asc';
  }

  // ... rest of implementation
}
```

### 4. Update Feed View

Modify `app/components/UI/Predict/views/PredictFeed/PredictFeed.tsx`:

```typescript
import { useSelector } from 'react-redux';
import { selectPredictLiveNflEnabled } from '../../selectors/featureFlags';
import { FEED_CATEGORIES, FEED_CATEGORIES_WITH_NFL, CATEGORY_LABELS } from '../../constants/feed';

const PredictFeed: React.FC = () => {
  const isNflEnabled = useSelector(selectPredictLiveNflEnabled);

  // Use NFL categories if feature is enabled
  const categories = isNflEnabled
    ? FEED_CATEGORIES_WITH_NFL
    : FEED_CATEGORIES;

  const [selectedCategory, setSelectedCategory] = useState<string>(categories[0]);

  // Render category tabs
  const renderTabs = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {categories.map((category) => (
        <Pressable
          key={category}
          onPress={() => setSelectedCategory(category)}
          style={tw.style(
            'px-4 py-2 mr-2 rounded-full',
            selectedCategory === category
              ? 'bg-primary-default'
              : 'bg-background-alternative',
          )}
        >
          <Text
            color={
              selectedCategory === category
                ? TextColor.TextInverse
                : TextColor.TextDefault
            }
          >
            {CATEGORY_LABELS[category]}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );

  // ... rest of component
};
```

### 5. Update PredictMarket Wrapper

Ensure `PredictMarket` wrapper correctly routes to `PredictMarketGame`:

```typescript
// app/components/UI/Predict/components/PredictMarket/PredictMarket.tsx
import PredictMarketGame from '../PredictMarketGame';
import PredictMarketSingle from '../PredictMarketSingle';
import PredictMarketMultiple from '../PredictMarketMultiple';

const PredictMarket: React.FC<PredictMarketProps> = ({ market, ...props }) => {
  // Route to game card if market has game data
  if (market.game) {
    return <PredictMarketGame market={market} {...props} />;
  }

  // Route to single or multiple based on outcome count
  if (market.outcomes.length === 1 && market.outcomes[0].tokens.length === 2) {
    return <PredictMarketSingle market={market} {...props} />;
  }

  return <PredictMarketMultiple market={market} {...props} />;
};
```

### 6. Unit Tests

**feed.test.ts:**

```typescript
import {
  FEED_CATEGORIES,
  FEED_CATEGORIES_WITH_NFL,
  CATEGORY_LABELS,
} from './feed';

describe('feed constants', () => {
  it('includes NFL in extended categories', () => {
    expect(FEED_CATEGORIES_WITH_NFL).toContain('nfl');
    expect(FEED_CATEGORIES).not.toContain('nfl');
  });

  it('has label for NFL category', () => {
    expect(CATEGORY_LABELS.nfl).toBe('NFL');
  });
});
```

**usePredictMarketData.test.tsx (additions):**

```typescript
describe('NFL category', () => {
  it('fetches markets with nfl tag when category is nfl', async () => {
    const mockGetMarkets = jest.fn().mockResolvedValue([]);

    // Setup mock controller

    const { result } = renderHook(() =>
      usePredictMarketData({ category: 'nfl' }),
    );

    await waitFor(() => {
      expect(mockGetMarkets).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ['nfl'],
          sortBy: 'volume24h',
          sortOrder: 'desc',
        }),
      );
    });
  });
});
```

**PredictFeed.test.tsx (additions):**

```typescript
describe('NFL tab', () => {
  it('shows NFL tab when feature flag is enabled', () => {
    // Mock feature flag to true
    jest.mock('../../selectors/featureFlags', () => ({
      selectPredictLiveNflEnabled: () => true,
    }));

    const { getByText } = render(<PredictFeed />);

    expect(getByText('NFL')).toBeTruthy();
  });

  it('hides NFL tab when feature flag is disabled', () => {
    // Mock feature flag to false
    jest.mock('../../selectors/featureFlags', () => ({
      selectPredictLiveNflEnabled: () => false,
    }));

    const { queryByText } = render(<PredictFeed />);

    expect(queryByText('NFL')).toBeNull();
  });
});
```

## Files to Create/Modify

| Action | File                                                                   |
| ------ | ---------------------------------------------------------------------- |
| Create | `app/components/UI/Predict/constants/feed.ts`                          |
| Create | `app/components/UI/Predict/constants/feed.test.ts`                     |
| Modify | `app/components/UI/Predict/hooks/usePredictMarketData.tsx`             |
| Modify | `app/components/UI/Predict/providers/types.ts`                         |
| Modify | `app/components/UI/Predict/providers/polymarket/PolymarketProvider.ts` |
| Modify | `app/components/UI/Predict/views/PredictFeed/PredictFeed.tsx`          |
| Modify | `app/components/UI/Predict/components/PredictMarket/PredictMarket.tsx` |

## Acceptance Criteria

- [ ] NFL tab appears in feed when feature flag is enabled
- [ ] NFL tab is hidden when feature flag is disabled
- [ ] Selecting NFL tab shows only markets with `nfl` tag
- [ ] NFL markets are sorted by 24h volume (highest first)
- [ ] PredictMarket wrapper routes game markets to PredictMarketGame
- [ ] Tab selection persists during session
- [ ] All unit tests pass

## Estimated Effort

4-6 hours

## Assignee

Developer B (UI - Card & Feed Track)
