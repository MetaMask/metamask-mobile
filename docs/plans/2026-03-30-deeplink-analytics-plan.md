# Deeplink Protocol Analytics Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fire wallet-side analytics events for the deeplink protocol path (Part A: DEEP_LINK_USED for SDK deeplinks, Part B: wallet events via sdk-analytics).

**Architecture:** Part A adds SDK routes to the existing DEEP_LINK_USED pipeline and fires the event before the early-exit in handleUniversalLink. Part B adds `analytics.track()` calls in DeeplinkProtocolService methods, matching the existing socket-relay pattern with a `transport: 'deeplink_protocol'` property.

**Tech Stack:** TypeScript, `@metamask/sdk-analytics`, `AnalyticsEventBuilder`, Jest

---

### Task 1: Add SDK routes to DeepLinkRoute enum and type guard

**Files:**

- Modify: `app/core/DeeplinkManager/types/deepLinkAnalytics.types.ts:38-59`
- Modify: `app/core/DeeplinkManager/types/deepLink.types.ts:116-150`

**Step 1: Add SDK_CONNECT and SDK_MMSDK to DeepLinkRoute enum**

In `app/core/DeeplinkManager/types/deepLinkAnalytics.types.ts`, add two new entries before `INVALID`:

```typescript
  NFT = 'nft',
  SDK_CONNECT = 'sdk_connect',
  SDK_MMSDK = 'sdk_mmsdk',
  INVALID = 'invalid',
```

**Step 2: Add SDK actions to SUPPORTED_ACTIONS in deepLink.types.ts**

In `app/core/DeeplinkManager/types/deepLink.types.ts`, add three entries to the `SUPPORTED_ACTIONS` array before `] as const`:

```typescript
  ACTIONS.SHIELD,
  ACTIONS.NFT,
  ACTIONS.CONNECT,
  ACTIONS.MMSDK,
  ACTIONS.ANDROID_SDK,
] as const satisfies readonly ACTIONS[];
```

**Step 3: Run TypeScript to check for compile errors**

Run: `yarn tsc --noEmit --project tsconfig.json 2>&1 | grep -i "deepLink\|DeepLinkRoute" | head -20`
Expected: Errors about missing cases in `routeExtractors` map (expected — we'll fix in Task 2).

**Step 4: Commit**

```bash
git add app/core/DeeplinkManager/types/deepLinkAnalytics.types.ts app/core/DeeplinkManager/types/deepLink.types.ts
git commit -m "feat(analytics): add SDK_CONNECT and SDK_MMSDK to DeepLinkRoute enum and SUPPORTED_ACTIONS"
```

---

### Task 2: Add SDK route mapping and extractors in deepLinkAnalytics.ts

**Files:**

- Modify: `app/core/DeeplinkManager/util/deeplinks/deepLinkAnalytics.ts:451-475` (routeExtractors)
- Modify: `app/core/DeeplinkManager/util/deeplinks/deepLinkAnalytics.ts:562-611` (mapSupportedActionToRoute)
- Test: `app/core/DeeplinkManager/util/deeplinks/deepLinkAnalytics.test.ts`

**Step 1: Write failing tests for the new route mappings**

Add to the `mapSupportedActionToRoute` describe block in `deepLinkAnalytics.test.ts`:

```typescript
it('maps CONNECT action to SDK_CONNECT route', () => {
  const result = mapSupportedActionToRoute(ACTIONS.CONNECT);
  expect(result).toBe(DeepLinkRoute.SDK_CONNECT);
});

it('maps MMSDK action to SDK_MMSDK route', () => {
  const result = mapSupportedActionToRoute(ACTIONS.MMSDK);
  expect(result).toBe(DeepLinkRoute.SDK_MMSDK);
});

it('maps ANDROID_SDK action to SDK_CONNECT route', () => {
  const result = mapSupportedActionToRoute(ACTIONS.ANDROID_SDK);
  expect(result).toBe(DeepLinkRoute.SDK_CONNECT);
});
```

**Step 2: Run tests to verify they fail**

Run: `yarn jest app/core/DeeplinkManager/util/deeplinks/deepLinkAnalytics.test.ts --no-coverage -t "maps CONNECT action"`
Expected: FAIL — returns `DeepLinkRoute.INVALID` instead of `SDK_CONNECT`.

**Step 3: Add cases to mapSupportedActionToRoute**

In `deepLinkAnalytics.ts`, add before the `default:` case in `mapSupportedActionToRoute`:

```typescript
    case ACTIONS.NFT:
      return DeepLinkRoute.NFT;
    case ACTIONS.CONNECT:
    case ACTIONS.ANDROID_SDK:
      return DeepLinkRoute.SDK_CONNECT;
    case ACTIONS.MMSDK:
      return DeepLinkRoute.SDK_MMSDK;
    default:
```

**Step 4: Add no-op extractors to routeExtractors map**

In `deepLinkAnalytics.ts`, add entries to the `routeExtractors` record after `[DeepLinkRoute.NFT]`:

```typescript
  [DeepLinkRoute.NFT]: extractNftProperties,
  [DeepLinkRoute.SDK_CONNECT]: extractInvalidProperties,
  [DeepLinkRoute.SDK_MMSDK]: extractInvalidProperties,
  [DeepLinkRoute.INVALID]: extractInvalidProperties,
```

SDK deeplinks don't carry route-specific sensitive params (addresses, gas, etc.), so reuse the no-op `extractInvalidProperties`.

**Step 5: Run tests to verify they pass**

Run: `yarn jest app/core/DeeplinkManager/util/deeplinks/deepLinkAnalytics.test.ts --no-coverage`
Expected: PASS

**Step 6: Commit**

```bash
git add app/core/DeeplinkManager/util/deeplinks/deepLinkAnalytics.ts app/core/DeeplinkManager/util/deeplinks/deepLinkAnalytics.test.ts
git commit -m "feat(analytics): add SDK route mapping and extractors for DEEP_LINK_USED"
```

---

### Task 3: Fire DEEP_LINK_USED before SDK early-exit in handleUniversalLink

**Files:**

- Modify: `app/core/DeeplinkManager/handlers/legacy/handleUniversalLink.ts:206-221`
- Test: `app/core/DeeplinkManager/handlers/legacy/__tests__/handleUniversalLink.test.ts`

**Step 1: Write failing test**

Add a test in `handleUniversalLink.test.ts` inside the top-level describe:

```typescript
import { createDeepLinkUsedEventBuilder } from '../../../util/deeplinks/deepLinkAnalytics';

describe('SDK action analytics', () => {
  it('fires DEEP_LINK_USED for connect deeplink before handleMetaMaskDeeplink', async () => {
    const mockBuild = jest.fn().mockReturnValue({});
    (createDeepLinkUsedEventBuilder as jest.Mock).mockResolvedValue({
      addProperties: jest.fn().mockReturnThis(),
      addSensitiveProperties: jest.fn().mockReturnThis(),
      build: mockBuild,
    });

    const url = `https://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/connect?channelId=test123&comm=deeplinking&pubkey=abc&scheme=testapp&v=2`;

    await handleUniversalLink({
      instance,
      handled: jest.fn(),
      urlObj: extractURLParams(url).urlObj,
      url,
      source: 'test',
    });

    expect(createDeepLinkUsedEventBuilder).toHaveBeenCalledWith(
      expect.objectContaining({
        route: expect.any(String),
        url,
      }),
    );
    expect(mockHandleMetaMaskDeeplink).toHaveBeenCalled();
  });
});
```

Note: `createDeepLinkUsedEventBuilder` is already mocked at the top of the test file. The test imports and mock setup already exist — you just need to add the test case and import `createDeepLinkUsedEventBuilder` from the mock.

**Step 2: Run test to verify it fails**

Run: `yarn jest app/core/DeeplinkManager/handlers/legacy/__tests__/handleUniversalLink.test.ts --no-coverage -t "fires DEEP_LINK_USED for connect"`
Expected: FAIL — `createDeepLinkUsedEventBuilder` not called.

**Step 3: Add analytics tracking before the early-exit**

In `handleUniversalLink.ts`, replace the SDK early-exit block (lines 206-221):

```typescript
// Intercept SDK actions and handle them in handleMetaMaskDeeplink
if (METAMASK_SDK_ACTIONS.includes(action)) {
  const mappedUrl = url.replace(
    `${PROTOCOLS.HTTPS}://${MM_IO_UNIVERSAL_LINK_HOST}/`,
    `${PROTOCOLS.METAMASK}://`,
  );
  const { urlObj: mappedUrlObj, params } = extractURLParams(mappedUrl);
  const wcURL = params?.uri || mappedUrlObj.href;

  // Fire DEEP_LINK_USED for SDK deeplinks (they previously bypassed all analytics)
  const sdkRoute = isSupportedAction(action)
    ? mapSupportedActionToRoute(action)
    : DeepLinkRoute.INVALID;

  trackDeepLinkAnalytics({
    url,
    route: sdkRoute,
    urlParams: params || {},
    signatureStatus: SignatureStatus.MISSING,
    interstitialShown: false,
    interstitialDisabled: false,
    interstitialAction: InterstitialState.NOT_SHOWN,
  });

  handleMetaMaskDeeplink({
    handled,
    wcURL,
    origin: source,
    params,
    url: mappedUrl,
  });
  return;
}
```

Key notes:

- SDK deeplinks don't have signatures → `SignatureStatus.MISSING`
- SDK deeplinks skip the interstitial → `interstitialShown: false`, `interstitialAction: NOT_SHOWN`
- No `branchParams` needed — we skip the Branch.io fetch for SDK actions to avoid the 500ms timeout on a hot path

**Step 4: Run test to verify it passes**

Run: `yarn jest app/core/DeeplinkManager/handlers/legacy/__tests__/handleUniversalLink.test.ts --no-coverage -t "fires DEEP_LINK_USED for connect"`
Expected: PASS

**Step 5: Run all handleUniversalLink tests**

Run: `yarn jest app/core/DeeplinkManager/handlers/legacy/__tests__/handleUniversalLink.test.ts --no-coverage`
Expected: All tests PASS (existing tests should not break since they don't assert on `createDeepLinkUsedEventBuilder` call count)

**Step 6: Commit**

```bash
git add app/core/DeeplinkManager/handlers/legacy/handleUniversalLink.ts app/core/DeeplinkManager/handlers/legacy/__tests__/handleUniversalLink.test.ts
git commit -m "feat(analytics): fire DEEP_LINK_USED for SDK deeplinks before early-exit"
```

---

### Task 4: Add wallet_connection_request_received to DeeplinkProtocolService.handleConnection()

**Files:**

- Modify: `app/core/SDKConnect/SDKDeeplinkProtocol/DeeplinkProtocolService.ts:1-4` (imports) and `:479-527` (handleConnection)
- Test: `app/core/SDKConnect/SDKDeeplinkProtocol/DeeplinkProtocolService.test.ts`

**Step 1: Write failing test for new session**

Add to `DeeplinkProtocolService.test.ts`. First, add the mock at the top level:

```typescript
jest.mock('@metamask/sdk-analytics', () => ({
  analytics: {
    track: jest.fn(),
  },
}));
```

And import:

```typescript
import { analytics } from '@metamask/sdk-analytics';
```

Then add a describe block:

```typescript
describe('handleConnection analytics', () => {
  const originatorInfo = {
    originatorInfo: {
      url: 'https://test-dapp.com',
      title: 'Test Dapp',
      platform: 'web',
      dappId: 'test',
      anonId: 'test-anon-id',
    },
  };

  const base64OriginatorInfo = Buffer.from(
    JSON.stringify(originatorInfo),
  ).toString('base64');

  it('tracks wallet_connection_request_received for new sessions', async () => {
    await service.init();

    await service.handleConnection({
      dappPublicKey: 'test-pub-key',
      url: 'https://test-dapp.com',
      scheme: 'testapp',
      channelId: 'new-channel-id',
      originatorInfo: base64OriginatorInfo,
    });

    expect(analytics.track).toHaveBeenCalledWith(
      'wallet_connection_request_received',
      expect.objectContaining({
        anon_id: 'test-anon-id',
        transport: 'deeplink_protocol',
        connection_type: 'new_session',
      }),
    );
  });

  it('tracks wallet_connection_request_received for reconnects', async () => {
    await service.init();

    // First connection creates the session
    await service.handleConnection({
      dappPublicKey: 'test-pub-key',
      url: 'https://test-dapp.com',
      scheme: 'testapp',
      channelId: 'reconnect-channel-id',
      originatorInfo: base64OriginatorInfo,
    });

    (analytics.track as jest.Mock).mockClear();

    // Second connection is a reconnect
    await service.handleConnection({
      dappPublicKey: 'test-pub-key',
      url: 'https://test-dapp.com',
      scheme: 'testapp',
      channelId: 'reconnect-channel-id',
      originatorInfo: base64OriginatorInfo,
    });

    expect(analytics.track).toHaveBeenCalledWith(
      'wallet_connection_request_received',
      expect.objectContaining({
        anon_id: 'test-anon-id',
        transport: 'deeplink_protocol',
        connection_type: 'reconnect',
      }),
    );
  });

  it('does not track when anonId is missing', async () => {
    const noAnonOriginatorInfo = {
      originatorInfo: {
        url: 'https://test-dapp.com',
        title: 'Test Dapp',
        platform: 'web',
        dappId: 'test',
      },
    };

    await service.init();

    await service.handleConnection({
      dappPublicKey: 'test-pub-key',
      url: 'https://test-dapp.com',
      scheme: 'testapp',
      channelId: 'no-anon-channel',
      originatorInfo: Buffer.from(
        JSON.stringify(noAnonOriginatorInfo),
      ).toString('base64'),
    });

    expect(analytics.track).not.toHaveBeenCalled();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `yarn jest app/core/SDKConnect/SDKDeeplinkProtocol/DeeplinkProtocolService.test.ts --no-coverage -t "handleConnection analytics"`
Expected: FAIL — `analytics.track` not called.

**Step 3: Add the analytics tracking**

In `DeeplinkProtocolService.ts`, add import at the top:

```typescript
import { analytics } from '@metamask/sdk-analytics';
```

In `handleConnection()`, after line 479 (`const isSessionExists = this.connections?.[clientInfo.clientId];`), add:

```typescript
// Track wallet-side connection event for deeplink protocol
const anonId = originatorInfo?.anonId;
if (anonId) {
  analytics.track('wallet_connection_request_received', {
    anon_id: anonId,
    transport: 'deeplink_protocol',
    connection_type: isSessionExists ? 'reconnect' : 'new_session',
    sdk_version: params.originatorInfo ? undefined : undefined, // sdk_version not available in originatorInfo
  });
}
```

Wait — `sdk_version` isn't directly available in `handleConnection` params. The `v` param from the URL is not passed through to this method. Let's check what's available. Looking at the call site in `handleMetaMaskDeeplink.ts:52-59`, the params passed are `channelId, url, scheme, dappPublicKey, originatorInfo, request` — no `v`. The `originatorInfo` object has `apiVersion` though. Use that:

```typescript
const anonId = originatorInfo?.anonId;
if (anonId) {
  analytics.track('wallet_connection_request_received', {
    anon_id: anonId,
    transport: 'deeplink_protocol',
    connection_type: isSessionExists ? 'reconnect' : 'new_session',
  });
}
```

We'll skip `sdk_version` here since it's not available in the method params. The `apiVersion` from `originatorInfo` could be added later if needed.

**Step 4: Run tests to verify they pass**

Run: `yarn jest app/core/SDKConnect/SDKDeeplinkProtocol/DeeplinkProtocolService.test.ts --no-coverage -t "handleConnection analytics"`
Expected: PASS

**Step 5: Commit**

```bash
git add app/core/SDKConnect/SDKDeeplinkProtocol/DeeplinkProtocolService.ts app/core/SDKConnect/SDKDeeplinkProtocol/DeeplinkProtocolService.test.ts
git commit -m "feat(analytics): track wallet_connection_request_received in deeplink protocol"
```

---

### Task 5: Add wallet_action_received to DeeplinkProtocolService.processDappRpcRequest()

**Files:**

- Modify: `app/core/SDKConnect/SDKDeeplinkProtocol/DeeplinkProtocolService.ts:529-581`
- Test: `app/core/SDKConnect/SDKDeeplinkProtocol/DeeplinkProtocolService.test.ts`

**Step 1: Write failing test**

Add to `DeeplinkProtocolService.test.ts`:

```typescript
describe('processDappRpcRequest analytics', () => {
  it('tracks wallet_action_received with rpc_method', async () => {
    await service.init();

    // Set up a connection first so originatorInfo is available
    const originatorInfo = {
      originatorInfo: {
        url: 'https://test-dapp.com',
        title: 'Test Dapp',
        platform: 'web',
        dappId: 'test',
        anonId: 'test-anon-id',
      },
    };

    const base64OriginatorInfo = Buffer.from(
      JSON.stringify(originatorInfo),
    ).toString('base64');

    await service.handleConnection({
      dappPublicKey: 'test-pub-key',
      url: 'https://test-dapp.com',
      scheme: 'testapp',
      channelId: 'rpc-channel',
      originatorInfo: base64OriginatorInfo,
    });

    (analytics.track as jest.Mock).mockClear();

    // Now process an RPC request — need a bridge to exist
    // The bridge is set up during handleConnection for new sessions
    // For reconnects, we call processDappRpcRequest directly
    // We may need to mock the bridge — check existing test setup

    await service.processDappRpcRequest({
      dappPublicKey: 'test-pub-key',
      url: 'https://test-dapp.com',
      scheme: 'testapp',
      channelId: 'rpc-channel',
      originatorInfo: base64OriginatorInfo,
      request: JSON.stringify({
        id: '1',
        method: 'eth_sendTransaction',
        params: [],
      }),
    });

    expect(analytics.track).toHaveBeenCalledWith(
      'wallet_action_received',
      expect.objectContaining({
        anon_id: 'test-anon-id',
        transport: 'deeplink_protocol',
        rpc_method: 'eth_sendTransaction',
      }),
    );
  });
});
```

Note: This test may need adjustments depending on whether the bridge mock is set up correctly from `handleConnection`. If the bridge isn't available, `processDappRpcRequest` will throw. You may need to mock `this.bridgeByClientId` or ensure the connection setup completes fully. Follow the existing test patterns in the file.

**Step 2: Run test to verify it fails**

Run: `yarn jest app/core/SDKConnect/SDKDeeplinkProtocol/DeeplinkProtocolService.test.ts --no-coverage -t "processDappRpcRequest analytics"`
Expected: FAIL — `analytics.track` not called (or test setup error to fix).

**Step 3: Add the analytics tracking**

In `processDappRpcRequest()`, after parsing the request object (line 546) and before the INTERNAL_ORIGINS check:

```typescript
const requestObject = JSON.parse(params.request!) as {
  id: string;
  method: string;
  params: any;
};

// Track wallet-side RPC action for deeplink protocol
const anonId = this.connections[params.channelId]?.originatorInfo?.anonId;
if (anonId) {
  analytics.track('wallet_action_received', {
    anon_id: anonId,
    transport: 'deeplink_protocol',
    rpc_method: requestObject.method,
  });
}
```

**Step 4: Run test to verify it passes**

Run: `yarn jest app/core/SDKConnect/SDKDeeplinkProtocol/DeeplinkProtocolService.test.ts --no-coverage -t "processDappRpcRequest analytics"`
Expected: PASS

**Step 5: Commit**

```bash
git add app/core/SDKConnect/SDKDeeplinkProtocol/DeeplinkProtocolService.ts app/core/SDKConnect/SDKDeeplinkProtocol/DeeplinkProtocolService.test.ts
git commit -m "feat(analytics): track wallet_action_received in processDappRpcRequest"
```

---

### Task 6: Add wallet_action_received to DeeplinkProtocolService.handleMessage()

**Files:**

- Modify: `app/core/SDKConnect/SDKDeeplinkProtocol/DeeplinkProtocolService.ts:709-905` (inside handleEventAsync)
- Test: `app/core/SDKConnect/SDKDeeplinkProtocol/DeeplinkProtocolService.test.ts`

**Step 1: Write failing test**

Add to `DeeplinkProtocolService.test.ts`:

```typescript
describe('handleMessage analytics', () => {
  it('tracks wallet_action_received for RPC messages', async () => {
    await service.init();

    // Set up connection first
    const originatorInfo = {
      originatorInfo: {
        url: 'https://test-dapp.com',
        title: 'Test Dapp',
        platform: 'web',
        dappId: 'test',
        anonId: 'test-anon-id',
      },
    };

    const base64OriginatorInfo = Buffer.from(
      JSON.stringify(originatorInfo),
    ).toString('base64');

    await service.handleConnection({
      dappPublicKey: 'test-pub-key',
      url: 'https://test-dapp.com',
      scheme: 'testapp',
      channelId: 'msg-channel',
      originatorInfo: base64OriginatorInfo,
    });

    (analytics.track as jest.Mock).mockClear();

    const rpcMessage = {
      id: '1',
      method: 'personal_sign',
      params: ['0xdeadbeef', '0x1234'],
    };

    const base64Message = Buffer.from(JSON.stringify(rpcMessage)).toString(
      'base64',
    );

    service.handleMessage({
      dappPublicKey: 'test-pub-key',
      url: 'https://test-dapp.com',
      message: base64Message,
      channelId: 'msg-channel',
      scheme: 'testapp',
      account: '0x1234@0x1',
    });

    // handleMessage fires async internally, so we need to wait
    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(analytics.track).toHaveBeenCalledWith(
      'wallet_action_received',
      expect.objectContaining({
        anon_id: 'test-anon-id',
        transport: 'deeplink_protocol',
        rpc_method: 'personal_sign',
      }),
    );
  });
});
```

Note: `handleMessage` is synchronous but fires `handleEventAsync()` internally. The analytics call should go in `handleEventAsync` after parsing the message, so we need to await with a timeout or flush promises.

**Step 2: Run test to verify it fails**

Run: `yarn jest app/core/SDKConnect/SDKDeeplinkProtocol/DeeplinkProtocolService.test.ts --no-coverage -t "handleMessage analytics"`
Expected: FAIL — `analytics.track` not called.

**Step 3: Add the analytics tracking**

In `handleMessage()`, inside `handleEventAsync()`, after the message is successfully parsed (line 738, after `data = message;`), add:

```typescript
data = message;

// Track wallet-side RPC action for deeplink protocol
const anonId = this.connections[sessionId]?.originatorInfo?.anonId;
if (anonId) {
  analytics.track('wallet_action_received', {
    anon_id: anonId,
    transport: 'deeplink_protocol',
    rpc_method: data.method,
  });
}
```

This fires after message parsing but before the account/chain change check, so we track all received RPC messages including ones that get rejected for state mismatches.

**Step 4: Run test to verify it passes**

Run: `yarn jest app/core/SDKConnect/SDKDeeplinkProtocol/DeeplinkProtocolService.test.ts --no-coverage -t "handleMessage analytics"`
Expected: PASS

**Step 5: Run all DeeplinkProtocolService tests**

Run: `yarn jest app/core/SDKConnect/SDKDeeplinkProtocol/DeeplinkProtocolService.test.ts --no-coverage`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add app/core/SDKConnect/SDKDeeplinkProtocol/DeeplinkProtocolService.ts app/core/SDKConnect/SDKDeeplinkProtocol/DeeplinkProtocolService.test.ts
git commit -m "feat(analytics): track wallet_action_received in handleMessage"
```

---

### Task 7: Run full test suite and verify no regressions

**Step 1: Run all affected test files**

Run: `yarn jest app/core/DeeplinkManager/ app/core/SDKConnect/SDKDeeplinkProtocol/ --no-coverage`
Expected: All tests PASS

**Step 2: Run TypeScript compilation check**

Run: `yarn tsc --noEmit --project tsconfig.json 2>&1 | tail -5`
Expected: No errors (or only pre-existing errors unrelated to our changes)

**Step 3: Run lint**

Run: `yarn lint:core app/core/DeeplinkManager/types/deepLinkAnalytics.types.ts app/core/DeeplinkManager/types/deepLink.types.ts app/core/DeeplinkManager/util/deeplinks/deepLinkAnalytics.ts app/core/DeeplinkManager/handlers/legacy/handleUniversalLink.ts app/core/SDKConnect/SDKDeeplinkProtocol/DeeplinkProtocolService.ts 2>&1 | tail -10`
Expected: No new lint errors

If lint command doesn't exist, try: `yarn eslint app/core/DeeplinkManager/types/deepLinkAnalytics.types.ts app/core/DeeplinkManager/types/deepLink.types.ts app/core/DeeplinkManager/util/deeplinks/deepLinkAnalytics.ts app/core/DeeplinkManager/handlers/legacy/handleUniversalLink.ts app/core/SDKConnect/SDKDeeplinkProtocol/DeeplinkProtocolService.ts`
