# Unified Deeplink Service

The Unified Deeplink Service consolidates deeplink handling for both traditional (`metamask://`) and universal (`https://link.metamask.io/`) deeplinks in MetaMask Mobile. This service provides a consistent, extensible architecture for processing deeplinks from various sources.

## Architecture Overview

The service consists of three main components:

### 1. DeeplinkService

The main orchestrator that handles the complete deeplink flow:

- Parsing and validation
- Security checks and signature verification
- Modal display logic
- Action execution

### 2. DeeplinkParser

Unified parser for all deeplink formats:

- Extracts action, path, and parameters
- Validates URL format and domain
- Handles both URL schemes consistently

### 3. ActionRegistry

Centralized registry for deeplink actions:

- Modular action handlers
- Scheme-specific support
- Easy extensibility

## Quick Start

### Registering a New Action

```typescript
import { actionRegistry } from './ActionRegistry';

actionRegistry.register({
  name: 'my-action',
  handler: async (params) => {
    // Handle the action
    console.log('Handling my-action with params:', params);
  },
  supportedSchemes: ['metamask://', 'https://'],
  description: 'My custom action handler',
});
```

### Handling a Deeplink

```typescript
import { deeplinkService } from './UnifiedDeeplinkService';

const result = await deeplinkService.handleDeeplink(url, {
  navigation,
  origin: 'deeplink',
  browserCallBack: callbackFn, // Optional: for in-app browser
});

if (result.success) {
  console.log('Deeplink handled successfully');
}
```

## Documentation

### Core Documentation

- **[Architecture Guide](./ActionRegistry.ts)** - Detailed component architecture
- **[Testing Guide](./TESTING_GUIDE.md)** - Comprehensive testing strategies

### Context-Specific Guides

- **[In-App Deeplink Handling](./INAPP_DEEPLINK_HANDLING.md)** - Browser and carousel deeplink behavior
- **[Deeplink Types and Contexts](./DEEPLINK_TYPES_AND_CONTEXTS.md)** - All supported deeplink formats and their behaviors

## Supported Actions

### Financial Actions

- `buy` / `buy-crypto` - Open buy crypto flow
- `sell` / `sell-crypto` - Open sell crypto flow
- `deposit` - Deposit fiat currency
- `swap` - Token swap interface

### Account Management

- `send` - Send tokens/ETH
- `create-account` - Create new account
- `rewards` - View rewards program

### DApp Integration

- `dapp` - Open DApp in browser
- `perps` - Perpetual futures trading
- `perps-markets` - View perps markets
- `perps-asset` - Specific perps asset

### Protocol Actions

- `wc` - WalletConnect connections
- `connect` - SDK connections
- `mmsdk` - SDK message handling
- `android-sdk` - Android SDK binding

## Feature Flag

The unified service is behind a feature flag for gradual rollout:

```typescript
// Check if enabled
import { isUnifiedDeeplinkServiceEnabled } from './ParseManager/DeeplinkFeatureFlag';

if (isUnifiedDeeplinkServiceEnabled()) {
  // Use unified service
}
```

## Security Features

### Signature Verification

- Supports signed deeplinks for both URL schemes
- Cryptographic verification of link authenticity
- Timestamp validation to prevent replay attacks

### Modal Display

- Security modals for universal links
- Domain validation
- User consent for sensitive actions

### Origin Tracking

- Tracks deeplink source (QR code, browser, external)
- Context-aware security policies
- Analytics and debugging support

## Migration Guide

### From Legacy Handlers

```typescript
// Old approach
switch(action) {
  case 'buy':
    handleBuyUrl(...);
    break;
}

// New approach
actionRegistry.register(createBuyCryptoAction());
```

### Adding New Actions

1. Create action handler in `actions/` directory
2. Register with `ActionRegistry`
3. Add tests
4. Update documentation

## Testing

### Unit Tests

```bash
yarn jest app/core/DeeplinkManager/UnifiedDeeplinkService
```

### Integration Tests

```bash
yarn jest app/core/DeeplinkManager/UnifiedDeeplinkService/DeeplinkService.integration.test.ts
```

### Manual Testing

See [Testing Guide](./TESTING_GUIDE.md) for detailed manual testing procedures.

## Debugging

Enable debug logging:

```typescript
DevLogger.log('DeeplinkService: Handling deeplink:', url);
```

Common issues:

- **Modal not showing**: Check origin and URL format
- **Action not found**: Verify action registration
- **Signature invalid**: Check timestamp and public key

## Contributing

1. Follow the existing patterns in `actions/` directory
2. Ensure 100% test coverage for new actions
3. Update relevant documentation
4. Test all supported URL schemes

## Future Enhancements

- [ ] OAuth redirect support
- [ ] Batch deeplink processing
- [ ] Advanced analytics integration
- [ ] Smart routing based on app state
- [ ] Preview mode for actions

## Related Files

- `/app/core/DeeplinkManager/` - Legacy deeplink system
- `/app/constants/deeplinks.ts` - Deeplink constants
- `/app/selectors/featureFlagController/` - Feature flag configuration
