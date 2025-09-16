We are building the reward usage in perps.

## TAT-1221 As a user, I pay a different MM builder fee based on my MetaMask Points tier

Acceptance criteria

- MM builder fee depends on MetaMask Reward tiers
  Tiers 1-3: 10bps
  Tier 4-5: 5bps
  Tier 6-7: 3.5bps
  Fee and fee discount are returned via RewardsController

UI display the fee discount in the app/components/UI/Perps/Views/PerpsOrderView/PerpsOrderView.tsx

## TAT-1223

As a user, I see how much points I will receive before my trade
Acceptance criteria:
Trade screens (open position AND close position) displays estimated #points earned if user has opted in Rewards program
Trade screen doesn't displays estimated #points earned if user has not opted in Rewards program
Points component is hidden for UK users

## Implementation Approach

### Fee Discount Implementation

Use RewardsController method instead of direct API calls:

```typescript
// Get perps fee discount for an account
const discountPercentage = await Engine.controllerMessenger.call(
  'RewardsController:getPerpsDiscountForAccount',
  caipAccountId, // account in CAIP-10 format
);
// Returns: Promise<number> - discount percentage (e.g., 50 for 50% off)
```

### Points Estimation Implementation

Use RewardsController method for points estimation:

```typescript
// Estimate points for perps trade
const estimatePointsDto: EstimatePointsDto = {
  activityType: 'PERPS', // Use PERPS for perps trades
  account: caipAccountId, // account in CAIP-10 format
  activityContext: {
    perpsContext: {
      type: 'OPEN_POSITION', // or 'CLOSE_POSITION'
      usdFeeValue: '100', // fee in USD as string
      coin: 'ETH', // asset symbol
    },
  },
};

const result = await Engine.controllerMessenger.call(
  'RewardsController:estimatePoints',
  estimatePointsDto,
);
// Returns: EstimatedPointsDto { pointsEstimate: number, bonusBips: number }
```

### Types Available in RewardsController

The following types are already available in `app/core/Engine/controllers/rewards-controller/types.ts`:

- `EstimatePointsDto` - Request format for points estimation
- `EstimatedPointsDto` - Response format with `pointsEstimate` and `bonusBips`
- `EstimatePerpsContextDto` - Perps-specific context data
- `CaipAccountId` - Account identifier format

## Implementation Notes

- Implementation is already integrated in `app/components/UI/Perps/hooks/usePerpsOrderFees.ts`
- Uses existing RewardsController infrastructure for consistency
- No need for additional API interfaces - use controller types directly
- Feature flag `selectRewardsEnabledFlag` controls functionality
- Supports caching and error handling via controller

## Rewards Icon Animation States

The rewards icon follows a specific state machine based on user interactions and data availability:

### State Flow:

```
Preload (empty fox) → Loading (shimmer) → Loaded (active + glow) → Refresh (spin) → Loaded
                                      ↘ Error (zero-state with message)
```

### State Implementation:

**Preload State**: Empty fox icon, no points visible

- Triggers: `shouldShow: false` or no data yet
- Animation: `Disable` trigger

**Loading State**: Fox icon with shimmer animation

- Triggers: `isRewardsLoading: true` (first load or API call)
- Animation: `Disable` trigger (shimmer handled by Rive internally)

**Loaded State**: Fox icon with points and discount tag

- Triggers: `estimatedPoints > 0` and not loading/error
- Animation: `Start` trigger
- Visual: Active orange icon + discount tag with glow

**Refresh State**: Fox icon spins to reveal updated points

- Triggers: `isRefresh: true` (when points value changes)
- Animation: `Refresh` trigger
- Behavior: Spins to origin and out to show new points

**Error State**: Zero-state fox with error message

- Triggers: `hasRewardsError: true`
- Animation: `Disable` trigger
- Visual: Empty fox icon + error tooltip

### Refresh Detection Logic:

```typescript
// In usePerpsRewards hook
const isRefresh = useMemo(() => {
  return (
    previousPoints !== undefined &&
    feeResults.estimatedPoints !== undefined &&
    previousPoints !== feeResults.estimatedPoints &&
    !isLoading &&
    !hasError
  );
}, [previousPoints, feeResults.estimatedPoints, isLoading, hasError]);
```

The refresh state triggers when:

- User changes order amount
- User changes leverage
- API returns different points value
- System recalculates fees
