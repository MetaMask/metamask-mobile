# Deeplink Types and Context Handling

This document provides a comprehensive guide to the different types of deeplinks supported in MetaMask Mobile and how they behave in various contexts.

## Deeplink URL Schemes

### 1. Traditional Deeplinks (`metamask://`)

Traditional deeplinks use the `metamask://` scheme and are handled directly by the app.

**Format**: `metamask://[action]/[path]?[params]`

**Examples**:

- `metamask://buy`
- `metamask://send/0x123...`
- `metamask://dapp/https://uniswap.org`
- `metamask://connect?channelId=123&pubkey=abc`

**Characteristics**:

- No modal shown (trusted internal format)
- Can be signed for additional security
- Works offline (no network validation required)

### 2. Universal Links (`https://`)

Universal links use HTTPS URLs that are intercepted by the app.

**Domains**:

- `https://link.metamask.io/`
- `https://metamask.app.link/`

**Examples**:

- `https://link.metamask.io/buy`
- `https://link.metamask.io/send/0x123...`
- `https://link.metamask.io/dapp/https://uniswap.org`

**Characteristics**:

- Shows security modal for user confirmation
- Can be signed for verified links
- Requires domain validation
- Better for sharing (preview support, fallback to web)

### 3. Protocol-Specific Deeplinks

**WalletConnect**: `wc:[connection-string]`

- Handled immediately without action routing
- Establishes WebSocket connections

**Ethereum**: `ethereum:[address][@chainId][/function][?params]`

- Standard EIP-681 payment requests
- Processed through transaction flow

**DApp Protocol**: `dapp://[url]`

- Opens URL in in-app browser
- Special handling for browser context

## Context-Specific Behaviors

### External Launch Context

When deeplinks are triggered from outside the app:

```typescript
origin: 'deeplink';
```

**Sources**:

- App launch via URL
- Push notifications
- External app redirects
- Web browser redirects

**Behavior**:

- Full security checks
- Modal display for universal links
- Navigation from current screen
- Session state verification

### QR Code Context

When deeplinks are scanned via QR code:

```typescript
origin: 'qr-code';
```

**Behavior**:

- Enhanced security warnings
- Special error messages for invalid QR codes
- Direct action execution after scanning
- No browser callback support

### In-App Browser Context

When deeplinks are triggered from the in-app browser:

```typescript
origin: 'in-app-browser';
browserCallBack: (url) => updateCurrentTab(url);
```

**Behavior**:

- Browser tab updates instead of navigation
- Reduced security modals (trusted context)
- Maintains browser history
- Special handling for `dapp://` links

### SDK Connection Context

When deeplinks are used for SDK connections:

```typescript
origin: 'sdk';
```

**Special Fast Path**:

- SDKConnectV2 links bypass normal flow
- Immediate WebSocket establishment
- No waiting for app unlock
- Handled before Redux initialization

## Action-Specific Behaviors

### Financial Actions

**Buy/Sell** (`buy`, `sell`, `buy-crypto`, `sell-crypto`):

- Shows amount and asset selection
- Validates regulatory compliance
- Tracks analytics events

```typescript
// Universal link shows modal
https://link.metamask.io/buy?amount=100&currency=ETH

// Traditional link skips modal
metamask://buy?amount=100&currency=ETH
```

### Navigation Actions

**DApp** (`dapp`):

- Opens in-app browser
- Uses callback in browser context
- Validates URL format

```typescript
// From external source - opens new tab
metamask://dapp/https://app.uniswap.org

// From browser - updates current tab
metamask://dapp/https://app.uniswap.org // with browserCallBack
```

### Account Actions

**Send** (`send`):

- Pre-fills transaction details
- Validates addresses
- Supports ENS resolution

```typescript
metamask://send/vitalik.eth?amount=1&asset=ETH
```

**Create Account** (`create-account`):

- Navigates to account creation
- Supports import flows
- Handles hardware wallet setup

### SDK Actions

**Connect** (`connect`):

- Establishes SDK connection
- Exchanges public keys
- Sets up communication channel

```typescript
metamask://connect?channelId=uuid&pubkey=key&comm=socket
```

**Message** (`mmsdk`):

- Handles SDK messages
- Processes RPC requests
- Maintains session state

## Modal Display Logic

### When Modals Are Shown

1. **Universal Links** - Always (unless signed and verified)
2. **Unknown Domains** - Invalid domain modal
3. **Suspicious Activity** - Security warning modal
4. **First Time Actions** - Educational modals

### When Modals Are Skipped

1. **Traditional Deeplinks** - Trusted format
2. **Signed & Verified Links** - With valid signatures
3. **Browser Context** - For same-domain navigation
4. **Whitelisted Actions** - Pre-approved actions

## Security Considerations

### Signature Verification

Deeplinks can be signed for additional security:

```typescript
// Signed deeplink format
metamask://buy?sig=0x123...&timestamp=1234567890

// Verification process
1. Extract signature and timestamp
2. Verify signature against known public key
3. Check timestamp validity (not expired)
4. Execute action if valid
```

### Origin Validation

Different origins have different trust levels:

```typescript
const TRUST_LEVELS = {
  deeplink: 'medium', // External, needs validation
  'in-app-browser': 'high', // Internal, trusted
  carousel: 'high', // Internal, curated
  'qr-code': 'low', // External, unknown source
  sdk: 'medium', // Depends on connection state
};
```

## Testing Different Contexts

### Test URLs by Context

```javascript
// External deeplink test
adb shell am start -W -a android.intent.action.VIEW -d "metamask://buy"

// Browser context test
window.location.href = "metamask://swap";

// QR code test
generateQRCode("metamask://send/0x742d35Cc6634C0532925a3b844Bc9e7595f6E123");

// SDK test
const deeplink = `metamask://connect?channelId=${uuid}&pubkey=${pubkey}`;
```

### Debugging Tools

Enable debug logging to see context flow:

```typescript
DevLogger.log('Deeplink Context', {
  url,
  origin,
  hasBrowserCallback: !!browserCallBack,
  isUniversalLink: url.startsWith('https://'),
  action: parsed.action,
});
```

## Common Issues and Solutions

### Issue: Deeplink Opens New Browser Tab Instead of Updating

**Cause**: Missing `browserCallBack` parameter

**Solution**:

```typescript
// Ensure callback is passed from browser
deeplinkManager.parse(url, {
  origin: 'in-app-browser',
  browserCallBack: updateTabCallback,
});
```

### Issue: Modal Shows When It Shouldn't

**Cause**: Incorrect origin or missing signature

**Solution**:

```typescript
// Set correct origin for internal sources
origin: 'carousel'; // Instead of 'deeplink'

// Or add signature for trusted links
const signedUrl = await signDeeplink(url);
```

### Issue: SDK Connection Delayed

**Cause**: Going through normal deeplink flow

**Solution**: SDK links are handled specially:

```typescript
// This happens automatically in parseDeeplinkUnified
if (SDKConnectV2.isConnectDeeplink(url)) {
  // Fast path - no waiting
  return SDKConnectV2.handleConnectDeeplink(url);
}
```

## Best Practices

1. **Always specify origin**: Helps with analytics and security
2. **Use callbacks wisely**: Only for browser context updates
3. **Test all contexts**: External, internal, and edge cases
4. **Log extensively**: Include context in error messages
5. **Validate early**: Check URL format before processing
6. **Handle errors gracefully**: Show appropriate messages by context

## Future Improvements

1. **Context Inheritance**: Pass parent context through navigation
2. **Smart Modal Logic**: ML-based risk assessment
3. **Batch Operations**: Handle multiple deeplinks efficiently
4. **Preview Mode**: Show action preview before execution
5. **Context-Aware Analytics**: Better tracking of user flows
