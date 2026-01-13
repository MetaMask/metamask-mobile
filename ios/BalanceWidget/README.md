# MetaMask Balance Widget - iOS

This is a proof of concept for an iOS home screen widget that displays the aggregated balance for a selected MetaMask account.

## Features

- **Account Selection**: Users can select which account's balance to display via widget configuration
- **Aggregated Balance**: Shows total fiat balance across all chains
- **Multiple Sizes**: Supports small, medium, large widgets and lock screen widgets
- **Auto-Refresh**: Widget refreshes every 15 minutes
- **Dark Theme**: Modern dark gradient design matching MetaMask branding

## Widget Sizes

| Size | Description |
|------|-------------|
| Small | Compact view with account name and balance |
| Medium | Includes MetaMask logo and address |
| Large | Full view with balance details and last updated time |
| Lock Screen (Circular) | Simple balance display |
| Lock Screen (Rectangular) | Account name and balance |
| Lock Screen (Inline) | Single line balance |

## Architecture

### Data Flow

```
React Native App
      ↓
  [useWidgetSync hook]
      ↓
  [WidgetBridge Native Module]
      ↓
  [App Group UserDefaults]
      ↓
  [WidgetKit Extension]
```

### Files

- `BalanceWidget.swift` - Main widget implementation with SwiftUI views
- `IntentHandler.swift` - Handles account selection configuration
- `SelectAccountIntent.intentdefinition` - Intent definition for account selection
- `WidgetDataManager.swift` (Shared) - Manages shared data between app and widget

### React Native Integration

```typescript
// In your main App component
import { useWidgetSync } from './app/core/Widget';

const App = () => {
  // Auto-syncs account/balance data to widget
  const { forceSync, clearWidget } = useWidgetSync();
  
  // Force sync on demand
  const handleRefresh = async () => {
    await forceSync();
  };
  
  // Clear widget on logout
  const handleLogout = async () => {
    await clearWidget();
  };
  
  // ...
};
```

## Setup Instructions

### 1. Add Widget Extension Target in Xcode

1. Open `MetaMask.xcworkspace` in Xcode
2. File → New → Target → Widget Extension
3. Name it "BalanceWidget"
4. Set Bundle Identifier to `io.metamask.MetaMask.BalanceWidget`
5. Check "Include Configuration Intent"

### 2. Configure App Groups

1. Select the main MetaMask target → Signing & Capabilities
2. Add "App Groups" capability
3. Add group: `group.io.metamask.wallet`
4. Repeat for the BalanceWidget target

### 3. Add Shared Code

1. Add `Shared/WidgetDataManager.swift` to both targets:
   - MetaMask (main app)
   - BalanceWidget (extension)

### 4. Link Widget Files

Add these files to the BalanceWidget target:
- `BalanceWidget/BalanceWidget.swift`
- `BalanceWidget/IntentHandler.swift`
- `BalanceWidget/SelectAccountIntent.intentdefinition`
- `BalanceWidget/Assets.xcassets`
- `BalanceWidget/Info.plist`
- `BalanceWidget/BalanceWidget.entitlements`

### 5. Update Native Bridge

The native bridge is already created at:
- `MetaMask/NativeModules/RCTWidgetBridge/RCTWidgetBridge.h`
- `MetaMask/NativeModules/RCTWidgetBridge/RCTWidgetBridge.m`

Add these files to the MetaMask target in Xcode.

## API Reference

### WidgetBridge (React Native)

```typescript
import { widgetBridge } from './app/core/Widget';

// Check if widgets are supported
const isSupported = await widgetBridge.isSupported();

// Update accounts
await widgetBridge.updateAccounts([
  { id: '1', name: 'Account 1', address: '0x...', type: 'eoa' }
]);

// Update balances
await widgetBridge.updateBalances([
  { accountId: '1', totalFiatBalance: 1234.56, currency: 'USD' }
]);

// Update all data at once
await widgetBridge.updateWidgetData({
  accounts: [...],
  balances: [...],
  currency: 'USD'
});

// Clear data (on logout)
await widgetBridge.clearData();

// Force widget refresh
await widgetBridge.refresh();
```

### useWidgetSync Hook

```typescript
import { useWidgetSync } from './app/core/Widget';

const { forceSync, clearWidget, refreshWidget } = useWidgetSync();

// Auto-syncs when accounts/balances change (debounced)
// Call forceSync() for immediate sync
// Call clearWidget() on logout
// Call refreshWidget() to force UI update
```

## Security Considerations

1. **App Groups**: Data is shared via App Groups which is sandboxed to the app and its extensions
2. **No Sensitive Data**: Only account names, addresses, and fiat balances are shared
3. **No Private Keys**: Private keys never leave the main app
4. **Clear on Logout**: Widget data should be cleared when user logs out

## Testing

### Simulator
1. Build and run the app
2. Add the widget from home screen
3. Long press widget → Edit Widget to select account

### Device
1. Requires Apple Developer account with App Groups capability
2. Widget must be signed with same team as main app

## Future Improvements

- [ ] Add network-specific balances
- [ ] Add NFT preview widget
- [ ] Add transaction shortcut widgets
- [ ] Add price alert widgets
- [ ] Support multiple account widgets simultaneously
- [ ] Add token breakdown in large widget

