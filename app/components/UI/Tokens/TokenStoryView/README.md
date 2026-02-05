# Token Story View

A full-screen vertical swipe navigation component for browsing token holdings, similar to Instagram Stories.

## Features

- **Vertical Swipe Navigation**: Swipe up/down to navigate between tokens
- **Full-Screen Token Cards**: Each token is displayed in a beautiful full-screen card
- **Animated Transitions**: Smooth animations when transitioning between tokens
- **Privacy Mode Support**: Respects the app's privacy mode settings
- **Page Indicators**: Visual indicators showing the current position
- **Deep Navigation**: Tap "View Details" to navigate to the full token details page

## Usage

### Basic Navigation

```tsx
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';

const MyComponent = () => {
  const navigation = useNavigation();

  const openTokenStoryView = () => {
    navigation.navigate(Routes.WALLET.TOKEN_STORY_VIEW, {
      initialIndex: 0, // Start from the first token
    });
  };

  return (
    <Button onPress={openTokenStoryView}>
      Browse Tokens
    </Button>
  );
};
```

### Opening from a Specific Token

If you want to open the story view starting from a specific token (e.g., when tapping on a token in the list):

```tsx
import { useSelector } from 'react-redux';
import { selectSortedAssetsBySelectedAccountGroup } from '../../../../selectors/assets/assets-list';

const TokenListItem = ({ tokenKey }) => {
  const navigation = useNavigation();
  const tokenKeys = useSelector(selectSortedAssetsBySelectedAccountGroup);

  const openTokenStory = () => {
    // Find the index of the current token
    const tokenIndex = tokenKeys.findIndex(
      (key) =>
        key.address === tokenKey.address &&
        key.chainId === tokenKey.chainId &&
        key.isStaked === tokenKey.isStaked
    );

    navigation.navigate(Routes.WALLET.TOKEN_STORY_VIEW, {
      initialIndex: tokenIndex >= 0 ? tokenIndex : 0,
    });
  };

  return (
    <Pressable onLongPress={openTokenStory}>
      {/* Token content */}
    </Pressable>
  );
};
```

## Components

### TokenStoryView

The main container component that manages the vertical pager.

**Props:**
- `initialIndex?: number` - Starting token index (default: 0)
- `onClose?: () => void` - Custom close handler

### TokenStoryCard

Full-screen card displaying a single token's information.

**Props:**
- `token: TokenI` - Token data to display
- `isActive: boolean` - Whether this card is currently visible
- `onViewDetails?: () => void` - Handler for the "View Details" button
- `index: number` - Position in the list
- `totalCount: number` - Total number of tokens

### TokenStoryIndicator

Vertical page indicator showing current position.

**Props:**
- `currentIndex: number` - Current page index
- `totalCount: number` - Total number of pages
- `maxIndicators?: number` - Maximum indicators to show (default: 5)

## Route Configuration

The route is configured in `Routes.WALLET.TOKEN_STORY_VIEW` and added to the MainNavigator with these options:

```js
{
  headerShown: false,
  presentation: 'fullScreenModal',
  animationEnabled: true,
  gestureEnabled: false, // Disabled to allow vertical swiping
}
```

## Localization

Add these strings to your localization files:

```json
{
  "wallet": {
    "token_story": {
      "swipe_to_browse": "Swipe to browse • {{current}} of {{total}}",
      "view_details": "View details"
    }
  }
}
```

## Analytics

The component tracks these events:
- `TOKEN_DETAILS_OPENED` with `source: 'token-story-view'` when swiping between tokens
- `TOKEN_DETAILS_OPENED` with `source: 'token-story-view-details'` when tapping "View Details"
