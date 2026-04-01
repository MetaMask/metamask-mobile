# WAPI-1375: SDK Analytics Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove `@metamask/sdk-analytics` and migrate all SDKv1 wallet-side events to the MetaMetrics pipeline, ensuring they respect user opt-in/opt-out.

**Architecture:** Replace 6 `analytics.track()` calls and 2 `SendAnalytics()` calls across 4 source files with standard MetaMetrics `trackEvent()` using `AnalyticsEventBuilder`. Add a local RPC method gating constant. Remove the `@metamask/sdk-analytics` package dependency.

**Tech Stack:** TypeScript, MetaMetrics (`app/util/analytics/analytics.ts`), `AnalyticsEventBuilder`, Jest

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `app/core/SDKConnect/SDKConnectConstants.ts` | Modify | Add `ANALYTICS_TRACKED_RPC_METHODS` constant |
| `app/core/SDKConnect/SDKConnect.ts` | Modify | Remove `analytics.enable()` and import |
| `app/core/SDKConnect/ConnectionManagement/connectToChannel.ts` | Modify | Replace 3 `analytics.track()` + 1 `SendAnalytics` with MetaMetrics |
| `app/core/SDKConnect/handlers/handleConnectionMessage.ts` | Modify | Replace 1 `analytics.track()` + 1 `SendAnalytics` with MetaMetrics, use local RPC list |
| `app/core/SDKConnect/handlers/handleSendMessage.ts` | Modify | Replace 2 `analytics.track()` with MetaMetrics, use local RPC list |
| `app/core/SDKConnect/ConnectionManagement/connectToChannel.test.ts` | Modify | Update mocks and assertions |
| `app/core/SDKConnect/handlers/handleConnectionMessage.test.ts` | Modify | Update mocks and assertions |
| `app/core/SDKConnect/handlers/handleSendMessage.test.ts` | Modify | Update mocks and assertions |
| `package.json` | Modify | Remove `@metamask/sdk-analytics` |

---

### Task 1: Add ANALYTICS_TRACKED_RPC_METHODS constant

**Files:**
- Modify: `app/core/SDKConnect/SDKConnectConstants.ts`

- [ ] **Step 1: Add the constant**

In `app/core/SDKConnect/SDKConnectConstants.ts`, add after the existing `METHODS_TO_DELAY` block (after line 54):

```typescript
export const ANALYTICS_TRACKED_RPC_METHODS: string[] = [
  'eth_sendTransaction',
  'eth_signTypedData',
  'eth_signTransaction',
  'personal_sign',
  'wallet_requestPermissions',
  'wallet_switchEthereumChain',
  'eth_signTypedData_v3',
  'eth_signTypedData_v4',
  'metamask_connectSign',
  'metamask_connectWith',
  'metamask_batch',
];
```

- [ ] **Step 2: Commit**

```bash
git add app/core/SDKConnect/SDKConnectConstants.ts
git commit -m "feat(sdk-analytics): add ANALYTICS_TRACKED_RPC_METHODS constant"
```

---

### Task 2: Remove analytics.enable() from SDKConnect.init()

**Files:**
- Modify: `app/core/SDKConnect/SDKConnect.ts:1-2,359-367`

- [ ] **Step 1: Remove the import and enable() call**

In `app/core/SDKConnect/SDKConnect.ts`:

Remove line 2:
```typescript
import { analytics } from '@metamask/sdk-analytics';
```

Replace lines 359-367:
```typescript
  public static async init({ context }: { context?: string }) {
    const navigation = NavigationService.navigation;
    const instance = SDKConnect.getInstance();

    analytics.setGlobalProperty('platform', 'mobile');
    analytics.enable();
    await init({ navigation, context, instance });
    await instance.postInit();
  }
```

With:
```typescript
  public static async init({ context }: { context?: string }) {
    const navigation = NavigationService.navigation;
    const instance = SDKConnect.getInstance();

    await init({ navigation, context, instance });
    await instance.postInit();
  }
```

- [ ] **Step 2: Verify no other usages of `analytics` remain in this file**

Run: `grep -n 'analytics' app/core/SDKConnect/SDKConnect.ts`
Expected: No matches (the only usage was in `init()`)

- [ ] **Step 3: Commit**

```bash
git add app/core/SDKConnect/SDKConnect.ts
git commit -m "feat(sdk-analytics): remove unconditional analytics.enable() from SDKConnect.init()"
```

---

### Task 3: Migrate connectToChannel.ts

**Files:**
- Modify: `app/core/SDKConnect/ConnectionManagement/connectToChannel.ts:1-6,77-84,179-208`
- Test: `app/core/SDKConnect/ConnectionManagement/connectToChannel.test.ts`

- [ ] **Step 1: Update imports in connectToChannel.ts**

Replace lines 1-6:
```typescript
import { analytics } from '@metamask/sdk-analytics';
import {
  MessageType,
  SendAnalytics,
  TrackingEvents,
} from '@metamask/sdk-communication-layer';
```

With:
```typescript
import { MessageType } from '@metamask/sdk-communication-layer';
import { analytics } from '../../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
```

- [ ] **Step 2: Replace wallet_connection_request_received (line 83)**

Replace:
```typescript
    analytics.track('wallet_connection_request_received', { anon_id: anonId });
```

With:
```typescript
    analytics.trackEvent(
      AnalyticsEventBuilder.createEventBuilder('wallet_connection_request_received')
        .addProperties({
          transport_type: 'socket_relay',
          sdk_version: originatorInfo?.apiVersion,
        })
        .addSensitiveProperties({ anon_id: anonId })
        .build(),
    );
```

- [ ] **Step 3: Replace wallet_connection_user_approved (line 183-185)**

Replace:
```typescript
          analytics.track('wallet_connection_user_approved', {
            anon_id: anonId,
          });
```

With:
```typescript
          analytics.trackEvent(
            AnalyticsEventBuilder.createEventBuilder('wallet_connection_user_approved')
              .addProperties({
                transport_type: 'socket_relay',
                sdk_version: originatorInfo?.apiVersion,
              })
              .addSensitiveProperties({ anon_id: anonId })
              .build(),
          );
```

- [ ] **Step 4: Replace wallet_connection_user_rejected (line 196-198)**

Replace:
```typescript
          analytics.track('wallet_connection_user_rejected', {
            anon_id: anonId,
          });
```

With:
```typescript
          analytics.trackEvent(
            AnalyticsEventBuilder.createEventBuilder('wallet_connection_user_rejected')
              .addProperties({
                transport_type: 'socket_relay',
                sdk_version: originatorInfo?.apiVersion,
              })
              .addSensitiveProperties({ anon_id: anonId })
              .build(),
          );
```

- [ ] **Step 5: Remove SendAnalytics call (lines 203-208)**

Remove:
```typescript
        SendAnalytics(
          { id, event: TrackingEvents.REJECTED, ...originatorInfo },
          instance.state.socketServerUrl,
        ).catch((err: Error) => {
          Logger.error(err, 'SendAnalytics failed');
        });
```

- [ ] **Step 6: Update the test file**

In `app/core/SDKConnect/ConnectionManagement/connectToChannel.test.ts`:

Replace the mock (lines 17-21):
```typescript
jest.mock('@metamask/sdk-analytics', () => ({
  analytics: {
    track: jest.fn(),
  },
}));
```

With:
```typescript
jest.mock('../../../util/analytics/analytics', () => ({
  analytics: {
    trackEvent: jest.fn(),
  },
}));
```

Replace the import (lines 25):
```typescript
import { analytics } from '@metamask/sdk-analytics';
```

With:
```typescript
import { analytics } from '../../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
```

Update the assertion in "should track wallet_connection_request_received" test (line 278-281):
```typescript
      expect(analytics.track).toHaveBeenCalledWith(
        'wallet_connection_request_received',
        { anon_id: 'test-anon-id' },
      );
```

With:
```typescript
      expect(analytics.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'wallet_connection_request_received',
          sensitiveProperties: expect.objectContaining({ anon_id: 'test-anon-id' }),
        }),
      );
```

Update the assertion in "should track wallet_connection_user_approved" test (line 299-302):
```typescript
      expect(analytics.track).toHaveBeenCalledWith(
        'wallet_connection_user_approved',
        { anon_id: 'test-anon-id' },
      );
```

With:
```typescript
      expect(analytics.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'wallet_connection_user_approved',
          sensitiveProperties: expect.objectContaining({ anon_id: 'test-anon-id' }),
        }),
      );
```

Update the assertion in "should track wallet_connection_user_rejected" test (line 328-331):
```typescript
      expect(analytics.track).toHaveBeenCalledWith(
        'wallet_connection_user_rejected',
        { anon_id: 'test-anon-id' },
      );
```

With:
```typescript
      expect(analytics.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'wallet_connection_user_rejected',
          sensitiveProperties: expect.objectContaining({ anon_id: 'test-anon-id' }),
        }),
      );
```

- [ ] **Step 7: Run tests**

Run: `yarn jest app/core/SDKConnect/ConnectionManagement/connectToChannel.test.ts --no-coverage`
Expected: All tests pass

- [ ] **Step 8: Commit**

```bash
git add app/core/SDKConnect/ConnectionManagement/connectToChannel.ts app/core/SDKConnect/ConnectionManagement/connectToChannel.test.ts
git commit -m "feat(sdk-analytics): migrate connectToChannel events to MetaMetrics"
```

---

### Task 4: Migrate handleConnectionMessage.ts

**Files:**
- Modify: `app/core/SDKConnect/handlers/handleConnectionMessage.ts:1-11,26-42,83-111`
- Test: `app/core/SDKConnect/handlers/handleConnectionMessage.test.ts`

- [ ] **Step 1: Update imports in handleConnectionMessage.ts**

Replace lines 5-11:
```typescript
import {
  CommunicationLayerMessage,
  isAnalyticsTrackedRpcMethod,
  MessageType,
  SendAnalytics,
  TrackingEvents,
} from '@metamask/sdk-communication-layer';
```

With:
```typescript
import {
  CommunicationLayerMessage,
  MessageType,
} from '@metamask/sdk-communication-layer';
```

Replace line 26:
```typescript
import { analytics } from '@metamask/sdk-analytics';
```

With:
```typescript
import { analytics } from '../../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import { ANALYTICS_TRACKED_RPC_METHODS } from '../SDKConnectConstants';
```

- [ ] **Step 2: Remove lcLogguedRPCs and replace with shared constant**

Remove lines 30-42:
```typescript
const lcLogguedRPCs = [
  'eth_sendTransaction',
  'eth_signTypedData',
  'eth_signTransaction',
  'personal_sign',
  'wallet_requestPermissions',
  'wallet_switchEthereumChain',
  'eth_signTypedData_v3',
  'eth_signTypedData_v4',
  'metamask_connectSign',
  'metamask_connectWith',
  'metamask_batch',
].map((method) => method.toLowerCase());
```

- [ ] **Step 3: Replace the analytics.track call (lines 85-89)**

Replace:
```typescript
  if (anonId && isAnalyticsTrackedRpcMethod(message.method)) {
    DevLogger.log(
      `[MM SDK Analytics] event=wallet_action_received anonId=${anonId}`,
    );
    analytics.track('wallet_action_received', { anon_id: anonId });
  }
```

With:
```typescript
  if (anonId && ANALYTICS_TRACKED_RPC_METHODS.includes(message.method)) {
    DevLogger.log(
      `[MM SDK Analytics] event=wallet_action_received anonId=${anonId}`,
    );
    analytics.trackEvent(
      AnalyticsEventBuilder.createEventBuilder('wallet_action_received')
        .addProperties({
          transport_type: 'socket_relay',
          sdk_version: connection.originatorInfo?.apiVersion,
          rpc_method: message.method,
          wallet_version: version,
        })
        .addSensitiveProperties({ anon_id: anonId })
        .build(),
    );
  }
```

- [ ] **Step 4: Remove the SendAnalytics call (lines 94-111)**

Replace:
```typescript
  if (lcLogguedRPCs.includes(message.method.toLowerCase())) {
    // Save analytics data on tracked methods
    SendAnalytics(
      {
        id: connection.channelId,
        event: TrackingEvents.SDK_RPC_REQUEST_RECEIVED,
        sdkVersion: connection.originatorInfo?.apiVersion,
        walletVersion: version,
        params: {
          method: message.method,
          from: 'mobile_wallet',
        },
      },
      connection.socketServerUrl,
    ).catch((error) => {
      Logger.error(error, 'SendAnalytics failed');
    });
  }
```

Remove this entire block. The data it carried (`rpc_method`, `sdk_version`, `wallet_version`) is now included in the `wallet_action_received` event above.

- [ ] **Step 5: Update the test file**

In `app/core/SDKConnect/handlers/handleConnectionMessage.test.ts`:

Replace the mock (lines 28-32):
```typescript
jest.mock('@metamask/sdk-analytics', () => ({
  analytics: {
    track: jest.fn(),
  },
}));
```

With:
```typescript
jest.mock('../../../util/analytics/analytics', () => ({
  analytics: {
    trackEvent: jest.fn(),
  },
}));
```

Replace the mock (lines 34-38):
```typescript
jest.mock('@metamask/sdk-communication-layer', () => ({
  ...jest.requireActual('@metamask/sdk-communication-layer'),
  isAnalyticsTrackedRpcMethod: jest.fn(),
  SendAnalytics: jest.fn(),
}));
```

With:
```typescript
jest.mock('@metamask/sdk-communication-layer', () => ({
  ...jest.requireActual('@metamask/sdk-communication-layer'),
}));
```

Replace import (line 26-27):
```typescript
import { analytics } from '@metamask/sdk-analytics';
```

With:
```typescript
import { analytics } from '../../../util/analytics/analytics';
```

Remove from the imports block (lines 7-8):
```typescript
  isAnalyticsTrackedRpcMethod,
```

In the "Analytics tracking for wallet_action_received" describe block:

Remove the `mockIsAnalyticsTrackedRpcMethod` variable and its setup in `beforeEach`. Instead, set the message method to a tracked method directly.

Replace the `beforeEach` (lines 160-178):
```typescript
    beforeEach(() => {
      mockIsAnalyticsTrackedRpcMethod.mockClear();
      (analytics.track as jest.Mock).mockClear();

      connection.originatorInfo = {
        url: 'https://test-dapp.com',
        title: 'Test Dapp',
        platform: 'web',
        dappId: 'test-dapp-id',
        icon: 'https://test-dapp.com/icon.png',
        scheme: 'https',
        source: 'browser',
        apiVersion: '1.0.0',
        connector: 'metamask',
        anonId: 'test-anon-id',
      } as OriginatorInfo;
      message.method = 'eth_requestAccounts';
      message.id = 'rpc-123';
      message.type = MessageType.JSONRPC;
    });
```

With:
```typescript
    beforeEach(() => {
      (analytics.trackEvent as jest.Mock).mockClear();

      connection.originatorInfo = {
        url: 'https://test-dapp.com',
        title: 'Test Dapp',
        platform: 'web',
        dappId: 'test-dapp-id',
        icon: 'https://test-dapp.com/icon.png',
        scheme: 'https',
        source: 'browser',
        apiVersion: '1.0.0',
        connector: 'metamask',
        anonId: 'test-anon-id',
      } as OriginatorInfo;
      message.method = 'eth_sendTransaction';
      message.id = 'rpc-123';
      message.type = MessageType.JSONRPC;
    });
```

Note: Changed `eth_requestAccounts` to `eth_sendTransaction` because `eth_requestAccounts` is NOT in `ANALYTICS_TRACKED_RPC_METHODS`.

Update "should track wallet_action_received" test (lines 181-193):
```typescript
    it('should track wallet_action_received when anonId is present and method is tracked', async () => {
      mockIsAnalyticsTrackedRpcMethod.mockReturnValue(true);

      await handleConnectionMessage({ message, engine: Engine, connection });

      expect(analytics.track).toHaveBeenCalledWith('wallet_action_received', {
        anon_id: 'test-anon-id',
      });
      expect(analytics.track).toHaveBeenCalledTimes(1);
      expect(mockIsAnalyticsTrackedRpcMethod).toHaveBeenCalledWith(
        'eth_requestAccounts',
      );
    });
```

With:
```typescript
    it('should track wallet_action_received when anonId is present and method is tracked', async () => {
      await handleConnectionMessage({ message, engine: Engine, connection });

      expect(analytics.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'wallet_action_received',
          sensitiveProperties: expect.objectContaining({ anon_id: 'test-anon-id' }),
        }),
      );
      expect(analytics.trackEvent).toHaveBeenCalledTimes(1);
    });
```

Update "should not track if anonId is missing" test (lines 195-203):
```typescript
    it('should not track wallet_action_received if anonId is missing', async () => {
      mockIsAnalyticsTrackedRpcMethod.mockReturnValue(true);
      if (connection.originatorInfo) {
        connection.originatorInfo.anonId = undefined;
      }

      await handleConnectionMessage({ message, engine: Engine, connection });

      expect(analytics.track).not.toHaveBeenCalled();
    });
```

With:
```typescript
    it('should not track wallet_action_received if anonId is missing', async () => {
      if (connection.originatorInfo) {
        connection.originatorInfo.anonId = undefined;
      }

      await handleConnectionMessage({ message, engine: Engine, connection });

      expect(analytics.trackEvent).not.toHaveBeenCalled();
    });
```

Update "should not track if method is not analytics tracked" test (lines 206-212):
```typescript
    it('should not track wallet_action_received if method is not analytics tracked', async () => {
      mockIsAnalyticsTrackedRpcMethod.mockReturnValue(false);

      await handleConnectionMessage({ message, engine: Engine, connection });

      expect(analytics.track).not.toHaveBeenCalled();
    });
```

With:
```typescript
    it('should not track wallet_action_received if method is not analytics tracked', async () => {
      message.method = 'eth_chainId';

      await handleConnectionMessage({ message, engine: Engine, connection });

      expect(analytics.trackEvent).not.toHaveBeenCalled();
    });
```

Update "should not track if message.method is undefined" test — replace `analytics.track` with `analytics.trackEvent`:
```typescript
      expect(analytics.trackEvent).not.toHaveBeenCalled();
```

- [ ] **Step 6: Run tests**

Run: `yarn jest app/core/SDKConnect/handlers/handleConnectionMessage.test.ts --no-coverage`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add app/core/SDKConnect/handlers/handleConnectionMessage.ts app/core/SDKConnect/handlers/handleConnectionMessage.test.ts
git commit -m "feat(sdk-analytics): migrate handleConnectionMessage events to MetaMetrics"
```

---

### Task 5: Migrate handleSendMessage.ts

**Files:**
- Modify: `app/core/SDKConnect/handlers/handleSendMessage.ts:1-2,27-43`
- Test: `app/core/SDKConnect/handlers/handleSendMessage.test.ts`

- [ ] **Step 1: Update imports in handleSendMessage.ts**

Replace lines 1-2:
```typescript
import { analytics } from '@metamask/sdk-analytics';
import { isAnalyticsTrackedRpcMethod } from '@metamask/sdk-communication-layer';
```

With:
```typescript
import { analytics } from '../../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import { ANALYTICS_TRACKED_RPC_METHODS } from '../SDKConnectConstants';
```

- [ ] **Step 2: Replace the analytics tracking block (lines 27-44)**

Replace:
```typescript
    if (
      isAnalyticsTrackedRpcMethod(method) &&
      msgId &&
      msgId !== 'undefined' &&
      anonId
    ) {
      if (msg?.data?.error) {
        DevLogger.log(
          `[MM SDK Analytics] event=wallet_action_user_rejected anonId=${anonId}`,
        );
        analytics.track('wallet_action_user_rejected', { anon_id: anonId });
      } else {
        DevLogger.log(
          `[MM SDK Analytics] event=wallet_action_user_approved anonId=${anonId}`,
        );
        analytics.track('wallet_action_user_approved', { anon_id: anonId });
      }
    }
```

With:
```typescript
    if (
      ANALYTICS_TRACKED_RPC_METHODS.includes(method) &&
      msgId &&
      msgId !== 'undefined' &&
      anonId
    ) {
      const eventName = msg?.data?.error
        ? 'wallet_action_user_rejected'
        : 'wallet_action_user_approved';

      DevLogger.log(
        `[MM SDK Analytics] event=${eventName} anonId=${anonId}`,
      );

      analytics.trackEvent(
        AnalyticsEventBuilder.createEventBuilder(eventName)
          .addProperties({
            transport_type: 'socket_relay',
            sdk_version: connection.originatorInfo?.apiVersion,
            rpc_method: method,
          })
          .addSensitiveProperties({ anon_id: anonId })
          .build(),
      );
    }
```

- [ ] **Step 3: Update the test file**

In `app/core/SDKConnect/handlers/handleSendMessage.test.ts`:

Replace the mock (lines 15-19):
```typescript
jest.mock('@metamask/sdk-analytics', () => ({
  analytics: {
    track: jest.fn(),
  },
}));
```

With:
```typescript
jest.mock('../../../util/analytics/analytics', () => ({
  analytics: {
    trackEvent: jest.fn(),
  },
}));
```

Replace the mock (lines 21-24):
```typescript
jest.mock('@metamask/sdk-communication-layer', () => ({
  ...jest.requireActual('@metamask/sdk-communication-layer'), // Preserve other exports
  isAnalyticsTrackedRpcMethod: jest.fn(),
}));
```

Remove this mock entirely — `isAnalyticsTrackedRpcMethod` is no longer imported.

Replace imports (lines 7-11):
```typescript
import { analytics } from '@metamask/sdk-analytics';
import {
  isAnalyticsTrackedRpcMethod,
  OriginatorInfo,
} from '@metamask/sdk-communication-layer';
```

With:
```typescript
import { analytics } from '../../../util/analytics/analytics';
import { OriginatorInfo } from '@metamask/sdk-communication-layer';
```

In the "Analytics tracking" describe block, update beforeEach (lines 80-89):

Replace:
```typescript
    const mockIsAnalyticsTrackedRpcMethod =
      isAnalyticsTrackedRpcMethod as jest.Mock;

    beforeEach(() => {
      mockRpcQueueManagerGetId.mockReturnValue(RPC_METHODS.ETH_REQUESTACCOUNTS); // Example tracked method
      mockIsAnalyticsTrackedRpcMethod.mockReturnValue(true);
      mockConnection.originatorInfo = {
        anonId: 'test-anon-id',
      } as OriginatorInfo;
    });
```

With:
```typescript
    beforeEach(() => {
      mockRpcQueueManagerGetId.mockReturnValue('eth_sendTransaction');
      mockConnection.originatorInfo = {
        anonId: 'test-anon-id',
      } as OriginatorInfo;
    });
```

Update "should track wallet_action_user_approved" assertion (lines 91-101):
```typescript
    it('should track wallet_action_user_approved when msg has no error', async () => {
      const msg = { data: { id: '123' } };
      await handleSendMessage({ msg, connection: mockConnection });

      expect(analytics.track).toHaveBeenCalledWith(
        'wallet_action_user_approved',
        {
          anon_id: 'test-anon-id',
        },
      );
    });
```

With:
```typescript
    it('should track wallet_action_user_approved when msg has no error', async () => {
      const msg = { data: { id: '123' } };
      await handleSendMessage({ msg, connection: mockConnection });

      expect(analytics.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'wallet_action_user_approved',
          sensitiveProperties: expect.objectContaining({ anon_id: 'test-anon-id' }),
        }),
      );
    });
```

Update "should track wallet_action_user_rejected" assertion (lines 103-113):
```typescript
    it('should track wallet_action_user_rejected when msg has an error', async () => {
      const msg = { data: { id: '123', error: 'User rejected' } };
      await handleSendMessage({ msg, connection: mockConnection });

      expect(analytics.track).toHaveBeenCalledWith(
        'wallet_action_user_rejected',
        {
          anon_id: 'test-anon-id',
        },
      );
    });
```

With:
```typescript
    it('should track wallet_action_user_rejected when msg has an error', async () => {
      const msg = { data: { id: '123', error: 'User rejected' } };
      await handleSendMessage({ msg, connection: mockConnection });

      expect(analytics.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'wallet_action_user_rejected',
          sensitiveProperties: expect.objectContaining({ anon_id: 'test-anon-id' }),
        }),
      );
    });
```

Update "should not track if method is not analytics tracked" test (lines 115-121):
```typescript
    it('should not track if method is not analytics tracked', async () => {
      mockIsAnalyticsTrackedRpcMethod.mockReturnValue(false);
      const msg = { data: { id: '123' } };
      await handleSendMessage({ msg, connection: mockConnection });

      expect(analytics.track).not.toHaveBeenCalled();
    });
```

With:
```typescript
    it('should not track if method is not analytics tracked', async () => {
      mockRpcQueueManagerGetId.mockReturnValue('eth_chainId');
      const msg = { data: { id: '123' } };
      await handleSendMessage({ msg, connection: mockConnection });

      expect(analytics.trackEvent).not.toHaveBeenCalled();
    });
```

Update remaining `analytics.track` references to `analytics.trackEvent` in the "should not track if msgId is undefined" and "should not track if anonId is missing" tests.

- [ ] **Step 4: Run tests**

Run: `yarn jest app/core/SDKConnect/handlers/handleSendMessage.test.ts --no-coverage`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add app/core/SDKConnect/handlers/handleSendMessage.ts app/core/SDKConnect/handlers/handleSendMessage.test.ts
git commit -m "feat(sdk-analytics): migrate handleSendMessage events to MetaMetrics"
```

---

### Task 6: Remove @metamask/sdk-analytics dependency

**Files:**
- Modify: `package.json:296`

- [ ] **Step 1: Remove the dependency**

In `package.json`, remove line 296:
```json
    "@metamask/sdk-analytics": "0.0.5",
```

- [ ] **Step 2: Update lockfile**

Run: `yarn install`
Expected: Lockfile updates, no errors

- [ ] **Step 3: Verify no remaining references**

Run: `grep -r '@metamask/sdk-analytics' app/ --include='*.ts' --include='*.tsx'`
Expected: No matches

Run: `grep -r 'SendAnalytics\|TrackingEvents\|isAnalyticsTrackedRpcMethod' app/ --include='*.ts' --include='*.tsx'`
Expected: No matches

- [ ] **Step 4: Run all affected tests together**

Run: `yarn jest app/core/SDKConnect/ConnectionManagement/connectToChannel.test.ts app/core/SDKConnect/handlers/handleConnectionMessage.test.ts app/core/SDKConnect/handlers/handleSendMessage.test.ts --no-coverage`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add package.json yarn.lock
git commit -m "feat(sdk-analytics): remove @metamask/sdk-analytics dependency"
```
