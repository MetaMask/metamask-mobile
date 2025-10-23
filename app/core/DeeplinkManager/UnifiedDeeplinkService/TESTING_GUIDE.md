# Unified Deeplink Service Testing Guide

This guide provides comprehensive testing strategies for the unified deeplink service, including unit tests, integration tests, and manual testing procedures.

## Unit Testing

### Testing Action Handlers

Each action handler should have comprehensive unit tests:

```typescript
// Example: RampActions.test.ts
describe('RampActions', () => {
  it('creates buy action with correct properties', () => {
    const action = createBuyCryptoAction();

    expect(action.name).toBe(ACTIONS.BUY);
    expect(action.supportedSchemes).toEqual(['metamask://', 'https://']);
    expect(action.handler).toBeDefined();
  });

  it('handles buy action with navigation', async () => {
    const action = createBuyCryptoAction();
    const params = createMockDeeplinkParams({
      action: ACTIONS.BUY,
      path: '/eth',
    });

    await action.handler(params);

    expect(mockHandleRampUrl).toHaveBeenCalledWith({
      rampPath: '/eth',
      navigation: params.navigation,
      rampType: RampType.BUY,
    });
  });
});
```

### Testing the Parser

```typescript
describe('DeeplinkParser', () => {
  const parser = DeeplinkParser.getInstance();

  it('parses traditional deeplinks', () => {
    const result = parser.parse('metamask://buy?amount=100');

    expect(result).toEqual({
      action: 'buy',
      path: '',
      params: { amount: '100' },
      originalUrl: 'metamask://buy?amount=100',
      scheme: 'metamask:',
      isUniversalLink: false,
      isSupportedDomain: true,
    });
  });

  it('validates URL format', () => {
    const parsed = parser.parse('invalid-url');
    const validation = parser.validate(parsed);

    expect(validation.isValid).toBe(false);
    expect(validation.reason).toContain('Invalid URL');
  });
});
```

### Testing the Service

```typescript
describe('DeeplinkService', () => {
  it('handles deeplink with modal display', async () => {
    const service = DeeplinkService.getInstance();

    mockHandleDeepLinkModalDisplay.mockImplementation((params) => {
      if ('onContinue' in params) {
        params.onContinue();
      }
    });

    const result = await service.handleDeeplink('https://link.metamask.io/buy');

    expect(result.success).toBe(true);
    expect(mockHandleDeepLinkModalDisplay).toHaveBeenCalled();
  });
});
```

## Integration Testing

### Testing URL Scheme Parity

Ensure both URL schemes behave consistently:

```typescript
describe('URL Scheme Parity', () => {
  const testCases = [
    {
      traditional: 'metamask://buy',
      universal: 'https://link.metamask.io/buy',
    },
    {
      traditional: 'metamask://send/0x123',
      universal: 'https://link.metamask.io/send/0x123',
    },
  ];

  testCases.forEach(({ traditional, universal }) => {
    it(`handles ${traditional} and ${universal} consistently`, async () => {
      const tradResult = await service.handleDeeplink(traditional);
      const univResult = await service.handleDeeplink(universal);

      expect(tradResult.action).toBe(univResult.action);
      // Universal links show modal, traditional don't
      expect(mockHandleDeepLinkModalDisplay).toHaveBeenCalledTimes(1);
    });
  });
});
```

### Testing Context Handling

```typescript
describe('Context-Specific Behavior', () => {
  it('uses browserCallBack for in-app browser context', async () => {
    const mockCallback = jest.fn();

    await service.handleDeeplink('metamask://dapp/https://uniswap.org', {
      origin: 'in-app-browser',
      browserCallBack: mockCallback,
    });

    expect(mockCallback).toHaveBeenCalledWith('https://uniswap.org');
  });
});
```

## Manual Testing

### Test Environment Setup

1. **Enable Feature Flag**

   ```bash
   # In .env or local config
   UNIFIED_DEEPLINKS_ENABLED=true
   ```

2. **Enable Debug Logging**
   ```javascript
   // In app startup
   __DEV__ && DevLogger.setEnabled(true);
   ```

### Test Scenarios

#### 1. External Deeplink Launch

**Test Traditional Deeplink**:

```bash
# Android
adb shell am start -W -a android.intent.action.VIEW \
  -d "metamask://buy?amount=100&currency=ETH"

# iOS Simulator
xcrun simctl openurl booted "metamask://buy?amount=100&currency=ETH"
```

**Test Universal Link**:

```bash
# Android
adb shell am start -W -a android.intent.action.VIEW \
  -d "https://link.metamask.io/buy?amount=100&currency=ETH"

# iOS Simulator
xcrun simctl openurl booted "https://link.metamask.io/buy?amount=100&currency=ETH"
```

#### 2. QR Code Testing

1. Generate QR codes for test URLs:

   ```javascript
   // Use any QR generator
   const testUrls = [
     'metamask://send/0x742d35Cc6634C0532925a3b844Bc9e7595f6E123',
     'metamask://connect?channelId=test123&pubkey=abc',
     'wc:connection-string-here',
   ];
   ```

2. Scan and verify:
   - Modal display behavior
   - Error handling for invalid QR codes
   - Navigation after scanning

#### 3. In-App Browser Testing

1. Create test HTML page:

   ```html
   <!DOCTYPE html>
   <html>
     <head>
       <title>Deeplink Test Page</title>
     </head>
     <body>
       <h1>MetaMask Deeplink Tests</h1>

       <h2>Financial Actions</h2>
       <a href="metamask://buy">Buy Crypto</a>
       <a href="metamask://sell">Sell Crypto</a>
       <a href="metamask://swap">Swap Tokens</a>

       <h2>DApp Actions</h2>
       <a href="metamask://dapp/https://app.uniswap.org">Open Uniswap</a>
       <a href="metamask://dapp/https://opensea.io">Open OpenSea</a>

       <h2>Account Actions</h2>
       <a href="metamask://send/vitalik.eth?amount=1">Send to ENS</a>
       <a href="metamask://create-account">Create Account</a>
     </body>
   </html>
   ```

2. Host locally and test in browser:
   ```bash
   python -m http.server 8000
   # Navigate to http://localhost:8000/test.html in MetaMask browser
   ```

#### 4. SDK Connection Testing

Test SDK deeplinks with proper fast path:

```javascript
// Test connection link
const channelId = generateUUID();
const pubkey = generatePublicKey();
const connectUrl = `metamask://connect?channelId=${channelId}&pubkey=${pubkey}&comm=socket`;

// Should establish connection immediately without app unlock
```

### Testing Checklist

#### Basic Functionality

- [ ] All actions work for both URL schemes
- [ ] Modal displays correctly for universal links
- [ ] No modal for traditional deeplinks
- [ ] Proper error messages for invalid URLs

#### Context-Specific

- [ ] Browser callback updates current tab
- [ ] QR scanner shows appropriate errors
- [ ] SDK links connect immediately
- [ ] Origin tracking works correctly

#### Security

- [ ] Signed deeplinks verify correctly
- [ ] Expired signatures are rejected
- [ ] Invalid domains show error modal
- [ ] Suspicious links show warning

#### Edge Cases

- [ ] Empty URLs handled gracefully
- [ ] Malformed URLs show errors
- [ ] Very long URLs work correctly
- [ ] Special characters in parameters

### Performance Testing

1. **Measure Parse Time**:

   ```typescript
   const start = performance.now();
   const result = await service.handleDeeplink(url);
   const duration = performance.now() - start;
   console.log(`Deeplink handled in ${duration}ms`);
   ```

2. **Test with Many Actions**:
   ```typescript
   // Register 100+ actions
   for (let i = 0; i < 100; i++) {
     actionRegistry.register({
       name: `action-${i}`,
       handler: async () => {},
       supportedSchemes: ['*'],
     });
   }
   // Measure lookup performance
   ```

### Debugging Failed Tests

1. **Enable Verbose Logging**:

   ```typescript
   DevLogger.log('Full deeplink context:', {
     url,
     parsed: deeplinkParser.parse(url),
     validation: deeplinkParser.validate(parsed),
     registeredActions: actionRegistry.getAllActions(),
   });
   ```

2. **Check Feature Flag**:

   ```typescript
   console.log('Unified service enabled:', isUnifiedDeeplinkServiceEnabled());
   ```

3. **Verify Action Registration**:
   ```typescript
   console.log('Has action:', actionRegistry.hasAction('buy'));
   ```

## Automated E2E Testing

### Detox Test Example

```javascript
describe('Deeplink E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      url: 'metamask://buy',
    });
  });

  it('opens buy screen from deeplink', async () => {
    await expect(element(by.id('buy-screen'))).toBeVisible();
  });
});
```

### CI/CD Integration

```yaml
# .github/workflows/test-deeplinks.yml
name: Test Deeplinks
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run deeplink tests
        run: |
          yarn test app/core/DeeplinkManager/UnifiedDeeplinkService
          yarn e2e:test --testNamePattern="Deeplink"
```

## Common Issues

### Tests Failing Locally

1. **Mock Reset Issues**:

   ```typescript
   beforeEach(() => {
     jest.clearAllMocks();
     // Reset specific mocks
     mockHandleDeepLinkModalDisplay.mockReset();
   });
   ```

2. **Async Timing**:
   ```typescript
   // Wait for navigation
   await waitFor(() => {
     expect(mockNavigation.navigate).toHaveBeenCalled();
   });
   ```

### Platform-Specific Issues

**iOS Universal Links**:

- Ensure AASA file is properly configured
- Test with actual device (simulator limitations)

**Android App Links**:

- Verify intent filters in manifest
- Test with different Android versions

## Best Practices

1. **Test Both URL Schemes**: Always test traditional and universal
2. **Mock External Dependencies**: Navigation, modals, etc.
3. **Test Error Paths**: Invalid URLs, network errors
4. **Verify Analytics**: Ensure events are tracked
5. **Document Test Cases**: Keep test scenarios updated
6. **Test on Real Devices**: Simulators have limitations

## Reporting Issues

When reporting test failures:

1. **Include Full Context**:

   - URL being tested
   - Expected vs actual behavior
   - Device/simulator info
   - Feature flag status

2. **Provide Logs**:

   ```bash
   adb logcat | grep -i deeplink > deeplink-logs.txt
   ```

3. **Steps to Reproduce**:
   - Exact commands/URLs used
   - App state before test
   - Network conditions
