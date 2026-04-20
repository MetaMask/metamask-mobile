# WebSocket Mocking in E2E Tests

The E2E framework includes a local WebSocket server that intercepts production WebSocket connections during tests. This enables deterministic testing of features that use real-time data streams (e.g., account activity notifications).

## Architecture

```
App (E2E build)
  │
  ├─ shim.js rewrites wss://gateway.api.cx.metamask.io → ws://localhost:<port>
  │
  └─ LocalWebSocketServer (tests/websocket/server.ts)
       │
       └─ Protocol mock (e.g. account-activity-mocks.ts)
            └─ Handles subscribe/unsubscribe, sends mock notifications
```

**Key files:**

| File                                        | Purpose                                                                          |
| ------------------------------------------- | -------------------------------------------------------------------------------- |
| `tests/websocket/server.ts`                 | `LocalWebSocketServer` — generic WS server implementing the `Resource` interface |
| `tests/websocket/constants.ts`              | Service definitions (production URL, fallback port, launch arg key)              |
| `tests/websocket/account-activity-mocks.ts` | Protocol-specific mock for AccountActivity WS                                    |
| `tests/framework/fixtures/FixtureHelper.ts` | Creates and manages the WS server per test run                                   |

## How It Works

1. `withFixtures` in `FixtureHelper.ts` creates a `LocalWebSocketServer` instance for every test run
2. The server is started via `startResourceWithRetry` with automatic port allocation
3. `setupAccountActivityMocks()` attaches protocol-specific message handlers
4. The allocated port is passed to the app via launch args (`accountActivityWsPort`)
5. The app's E2E shim rewrites the production WebSocket URL to `ws://localhost:<port>`
6. After the test, the server is stopped and connections are cleaned up

## Using the Existing AccountActivity Mock

The AccountActivity WebSocket mock is available in every test automatically. For most tests, you don't need to do anything — the mock server handles subscribe/unsubscribe handshakes in the background.

To explicitly test WebSocket behavior, use the helpers from `account-activity-mocks.ts`:

```typescript
import {
  waitForAccountActivitySubscription,
  getAccountActivitySubscriptionCount,
  waitForAccountActivityDisconnection,
  createBalanceUpdateNotification,
} from '../../websocket/account-activity-mocks';
```

### Waiting for a subscription

```typescript
// Set up the waiter BEFORE the action that triggers the connection
const subscriptionPromise = waitForAccountActivitySubscription();
await loginToApp();
const subscriptionId = await subscriptionPromise;
```

### Checking subscription count

```typescript
assertEqual(getAccountActivitySubscriptionCount(), 1);
```

### Waiting for disconnection

```typescript
await device.sendToHome();
await waitForAccountActivityDisconnection();
```

### Sending a mock balance update

```typescript
const notification = createBalanceUpdateNotification({
  subscriptionId,
  channel: 'account-activity.v1',
  address: '0x1234...',
  chain: 'eip155:1',
  updates: [
    {
      asset: { fungible: true, type: 'native', unit: 'ETH', decimals: 18 },
      postBalance: { amount: '1000000000000000000' },
      transfers: [
        { from: '0x0...', to: '0x1234...', amount: '500000000000000000' },
      ],
    },
  ],
});

// Broadcast to all connected clients
accountActivityWsServer.sendMessage(JSON.stringify(notification));
```

### Example spec

See `tests/smoke/account-activity/web-socket-connection.spec.ts` for a complete example with three tests covering subscribe-on-login, resubscribe-after-background, and resubscribe-after-lock.

## Adding a New WebSocket Service Mock

To mock a new WebSocket service (e.g., a new real-time data feed):

### 1. Define the service in `tests/websocket/constants.ts`

```typescript
export const MY_NEW_WS: WebSocketServiceConfig = {
  url: 'wss://my-service.example.com',
  fallbackPort: 8090, // pick a unique port
  launchArgKey: 'myNewWsPort',
};

// Add it to the services array
export const WS_SERVICES: WebSocketServiceConfig[] = [
  ACCOUNT_ACTIVITY_WS,
  MY_NEW_WS,
];
```

### 2. Create a protocol mock in `tests/websocket/`

```typescript
// tests/websocket/my-service-mocks.ts
import type LocalWebSocketServer from './server.ts';
import { WebSocket } from 'ws';

export async function setupMyServiceMocks(
  server: LocalWebSocketServer,
): Promise<void> {
  const wsServer = server.getServer();

  wsServer.on('connection', (socket: WebSocket) => {
    // Handle incoming messages
    socket.on('message', (data) => {
      const raw = data.toString();
      // Parse and respond based on your protocol
    });

    // Send initial data on connection
    socket.send(JSON.stringify({ type: 'connected' }));
  });
}
```

### 3. Register in `FixtureHelper.ts`

Add the server creation, startup, and cleanup alongside the existing `accountActivityWsServer` pattern:

```typescript
const myNewWsServer = new LocalWebSocketServer('myNewService');
// ...
await startResourceWithRetry(ResourceType.MY_NEW_WS, myNewWsServer);
await setupMyServiceMocks(myNewWsServer);
```

Pass the port via launch args:

```typescript
[MY_NEW_WS.launchArgKey]: isAndroid
  ? `${MY_NEW_WS.fallbackPort}`
  : `${myNewWsServer.getServerPort()}`,
```

### 4. Register the port in PortManager

Add the new `ResourceType` and fallback port in `tests/framework/PortManager.ts` so the framework can manage port allocation and Android `adb reverse` forwarding.
