# Card SDK

A React SDK for managing MetaMask Card functionality, inspired by the RampsSDK architecture.

## Overview

The Card SDK provides a centralized way to manage card-related functionality including:

- Card holder status checking
- Token balance fetching
- Geolocation services
- Supported token management
- Loading and error states

## Files Structure

```
app/components/UI/Card/sdk/
├── index.tsx       # Main SDK implementation
├── hooks.ts        # Custom hooks for common patterns
├── examples.tsx    # Usage examples (with lint issues - for reference only)
└── README.md       # This documentation
```

## Basic Usage

### 1. Provider Setup

Wrap your components with the `CardSDKProvider`:

```tsx
import { CardSDKProvider } from './app/components/UI/Card/sdk';

function App() {
  return (
    <CardSDKProvider>
      <YourCardComponents />
    </CardSDKProvider>
  );
}
```

### 2. Using the SDK Hook

Access the SDK functionality with the `useCardSDK` hook:

```tsx
import { useCardSDK } from './app/components/UI/Card/sdk';

function CardComponent() {
  const {
    selectedAddress,
    isCardHolderStatus,
    checkCardHolderStatus,
    fetchBalances,
    tokenBalances,
    totalBalanceDisplay,
    isLoadingCardHolder,
    isLoadingBalances,
  } = useCardSDK();

  // Your component logic here
}
```

### 3. Using Custom Hooks

The SDK provides specialized hooks for common patterns:

```tsx
import {
  useCardHolderStatus,
  useTokenBalances,
  useCardEligibility,
} from './app/components/UI/Card/sdk/hooks';

function CardStatusComponent({ cardFeature }) {
  // Automatically check card holder status when address changes
  const { isCardHolder, isLoading, error, refetch } =
    useCardHolderStatus(cardFeature);

  // Automatically fetch token balances
  const { balances, totalBalance, priorityToken } =
    useTokenBalances(cardFeature);

  // Check overall eligibility (card holder + supported network)
  const { isEligible, isNetworkSupported } = useCardEligibility(cardFeature);
}
```

## Available Hooks

### `useCardHolderStatus(cardFeature, autoCheck?)`

- Automatically checks if the current address is a card holder
- Returns: `{ isCardHolder, isLoading, error, refetch }`

### `useTokenBalances(cardFeature, autoFetch?)`

- Fetches supported token balances for the current address
- Returns: `{ balances, totalBalance, priorityToken, isLoading, error, refetch }`

### `useUserLocation(autoFetch?)`

- Manages user geolocation fetching
- Returns: `{ location, isLoading, error, fetchLocation }`

### `useCardEligibility(cardFeature)`

- Combines card holder status with network support check
- Returns: `{ isEligible, isCardHolder, isNetworkSupported, isLoading, error }`

### `useCardDataRefresh(cardFeature, intervalMs?)`

- Sets up periodic refresh of card data
- Returns: `{ refreshAll }`

## SDK Interface

The main `CardSDK` interface provides:

### Core State

- `selectedAddress`: Current user address
- `selectedChainId`: Current chain ID
- `selectedNetworkName`: Current network name

### Card Holder Status

- `isCardHolderStatus`: Boolean or null
- `checkCardHolderStatus()`: Function to check status
- `isLoadingCardHolder`: Loading state
- `cardHolderError`: Error state

### Token Balances

- `tokenBalances`: Array of token configurations
- `totalBalanceDisplay`: Formatted total balance
- `priorityToken`: The most recently approved token
- `fetchBalances()`: Function to fetch balances
- `isLoadingBalances`: Loading state
- `balancesError`: Error state

### Geolocation

- `userLocation`: User's location string
- `fetchUserLocation()`: Function to fetch location
- `isLoadingLocation`: Loading state
- `locationError`: Error state

### Utility Functions

- `mapTokensToKeys()`: Convert tokens to FlashList format
- `supportedTokens`: Currently supported tokens
- `config`: SDK configuration

## Configuration

Default configuration includes:

- `CACHE_EXPIRATION`: 15 minutes
- `POLLING_INTERVAL`: 30 seconds
- `SUPPORTED_CHAIN_IDS`: ['59144'] (Linea mainnet)

## Error Handling

The SDK provides comprehensive error handling:

- Individual error states for each operation
- Automatic error logging via Logger utility
- Graceful fallbacks for failed operations

## Integration with Existing Utils

The SDK wraps and enhances the existing `card.utils.ts` functions:

- `isCardHolder()`: Enhanced with caching and loading states
- `fetchSupportedTokensBalances()`: Integrated with React state
- `getGeoLocation()`: Added error handling and loading states
- `mapTokenBalancesToTokenKeys()`: Available as utility function

## HOC Usage

For components that need card functionality, you can use the HOC:

```tsx
import { withCardSDK } from './app/components/UI/Card/sdk';

const MyCardComponent = () => {
  const { selectedAddress, checkCardHolderStatus } = useCardSDK();
  // Component logic
};

export default withCardSDK(MyCardComponent);
```

## Best Practices

1. **Use appropriate hooks**: Choose the right hook for your use case rather than always using the main `useCardSDK` hook
2. **Handle loading states**: Always show loading indicators when operations are in progress
3. **Handle errors gracefully**: Display user-friendly error messages and provide retry options
4. **Optimize re-renders**: The SDK uses `useMemo` and `useCallback` to minimize unnecessary re-renders
5. **Cache awareness**: The SDK implements caching for card holder status - be aware of the 15-minute cache expiration

## Migration from Direct Utils Usage

If you're currently using `card.utils.ts` functions directly, you can migrate to the SDK:

**Before:**

```tsx
import { isCardHolder, fetchSupportedTokensBalances } from './card.utils';

// Manual state management and error handling
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState(null);

const checkStatus = async () => {
  setIsLoading(true);
  try {
    const result = await isCardHolder(address, cardFeature, chainId);
    // Handle result
  } catch (err) {
    setError(err);
  } finally {
    setIsLoading(false);
  }
};
```

**After:**

```tsx
import { useCardHolderStatus } from './app/components/UI/Card/sdk/hooks';

// Automatic state management
const { isCardHolder, isLoading, error, refetch } =
  useCardHolderStatus(cardFeature);
```
