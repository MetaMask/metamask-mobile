# In-App Browser and Carousel Deeplink Handling

This document describes how deeplinks are handled when triggered from within the MetaMask Mobile app, specifically from the in-app browser and carousel components.

## Overview

Deeplinks can be triggered from various sources within the app:

- External sources (app launch, push notifications, QR codes)
- Internal sources (in-app browser, carousel, internal navigation)

The unified deeplink service handles all these scenarios consistently while maintaining context through the `origin` and `browserCallBack` parameters.

## Key Concepts

### Origin Tracking

The `origin` parameter tracks where a deeplink was triggered from:

- `'deeplink'` - External deeplink (app launch, system URL handler)
- `'qr-code'` - QR code scanner
- `'in-app-browser'` - In-app browser navigation
- `'carousel'` - Carousel or promotional content
- `'sdk'` - SDK connections
- `'wc'` - WalletConnect

### Browser Callback

The `browserCallBack` parameter is a special callback function used when deeplinks are triggered from the in-app browser. Instead of navigating to a new browser tab, this callback updates the current browser tab's URL.

## In-App Browser Deeplink Handling

### How It Works

1. **User clicks a deeplink in the browser**

   - The browser detects MetaMask deeplinks (e.g., `metamask://`, `https://link.metamask.io/`)
   - Instead of opening externally, it processes internally

2. **Browser passes callback to DeeplinkManager**

   ```typescript
   deeplinkManager.parse(url, {
     origin: 'in-app-browser',
     browserCallBack: (newUrl) => {
       // Update current browser tab with new URL
       updateBrowserTab(newUrl);
     },
   });
   ```

3. **DeeplinkService handles the action**
   - For `dapp://` actions, uses the callback to update the browser
   - For other actions, navigates away from browser as needed

### Example: DApp Navigation

When a user clicks a link like `metamask://dapp/https://uniswap.org`:

```typescript
// In DAppActions.ts
if (params.params.browserCallBack) {
  // Update current browser tab
  params.params.browserCallBack('https://uniswap.org');
} else {
  // Open new browser tab
  navigation.navigate(Routes.BROWSER.HOME, {
    screen: Routes.BROWSER.VIEW,
    params: {
      newTabUrl: 'https://uniswap.org',
      timestamp: Date.now(),
    },
  });
}
```

## Carousel Deeplink Handling

Carousels in MetaMask Mobile can contain promotional content with deeplinks. These work similarly to browser deeplinks but with different origin tracking.

### Implementation Pattern

```typescript
// In carousel component
const handleCarouselItemPress = (deeplink: string) => {
  deeplinkManager.parse(deeplink, {
    origin: 'carousel',
    onHandled: () => {
      // Track analytics
      trackEvent('carousel_deeplink_clicked');
    },
  });
};
```

### Supported Actions from Carousel

Carousels typically trigger:

- **Buy/Sell actions**: `metamask://buy`, `metamask://sell`
- **Feature discovery**: `metamask://swap`, `metamask://perps`
- **Educational content**: `metamask://dapp/https://learn.metamask.io`

## Implementation Details

### DeeplinkService Integration

The unified deeplink service processes all deeplinks consistently:

```typescript
export interface DeeplinkServiceOptions {
  navigation?: NavigationProp<ParamListBase>;
  browserCallBack?: (url: string) => void;
  origin?: string;
  onHandled?: () => void;
}
```

### Action Handler Example

```typescript
// In handleBrowserUrl.ts
function handleBrowserUrl({
  deeplinkManager,
  url,
  callback,
}: {
  deeplinkManager: DeeplinkManager;
  url: string;
  callback?: (url: string) => void;
}) {
  if (callback) {
    // Update existing browser tab
    callback(url);
  } else {
    // Navigate to new browser tab
    deeplinkManager.navigation.navigate(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params: {
        newTabUrl: url,
        linkType: EXTERNAL_LINK_TYPE,
        timestamp: Date.now(),
      },
    });
  }
}
```

## Security Considerations

### Modal Display Rules

1. **Universal links from browser**: Show security modal
2. **Traditional deeplinks from browser**: Skip modal (trusted internal source)
3. **Carousel deeplinks**: Follow standard modal rules based on link type

### Signature Verification

Signed deeplinks work the same regardless of origin:

- Signature is verified before execution
- Invalid signatures show appropriate error modal
- Valid signatures may skip user confirmation based on configuration

## Testing In-App Deeplinks

### Manual Testing

1. **In-App Browser Testing**

   ```javascript
   // Create test page with deeplinks
   <a href="metamask://buy">Buy Crypto</a>
   <a href="metamask://dapp/https://app.uniswap.org">Open Uniswap</a>
   ```

2. **Carousel Testing**
   - Use development builds with test carousel data
   - Verify origin tracking in logs
   - Test both navigation and callback scenarios

### Automated Testing

```typescript
// Test browser callback
it('uses browserCallBack when provided', async () => {
  const mockCallback = jest.fn();

  await deeplinkService.handleDeeplink('metamask://dapp/https://example.com', {
    browserCallBack: mockCallback,
    origin: 'in-app-browser',
  });

  expect(mockCallback).toHaveBeenCalledWith('https://example.com');
});
```

## Common Patterns

### Preventing Navigation Loops

When handling deeplinks from the browser, ensure you don't create navigation loops:

```typescript
// Bad: Could create loop
if (isDeeplink(url)) {
  handleDeeplink(url);
}

// Good: Check context first
if (isDeeplink(url) && origin !== 'in-app-browser') {
  handleDeeplink(url);
}
```

### Analytics Integration

Track deeplink usage by origin:

```typescript
Analytics.track('Deeplink Handled', {
  action: parsed.action,
  origin: options.origin,
  isInternal: ['in-app-browser', 'carousel'].includes(options.origin),
});
```

## Future Enhancements

1. **Context Preservation**: Pass additional context about the triggering element
2. **Preview Mode**: Show deeplink preview before execution
3. **Batch Processing**: Handle multiple deeplinks from carousel efficiently
4. **Smart Routing**: Route based on current app state and user context

## Related Documentation

- [DeeplinkService Architecture](./README.md)
- [Action Registry](./ActionRegistry.ts)
- [Testing Guide](./TESTING_GUIDE.md)
