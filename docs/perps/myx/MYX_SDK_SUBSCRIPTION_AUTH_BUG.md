# MYX SDK Bug Report: `subscription.auth()` Fails with 9401 Even with Valid Token

## Summary

**SDK Version**: `@myx-trade/sdk` (latest)
**Issue**: `client.subscription.auth()` fails with `9401 Unauthorized` even when manual WebSocket authentication with the **same token** succeeds.

**Root Cause**: The SDK's `subscription.auth()` method appears to have an internal issue where it cannot successfully authenticate, even when:
1. The access token is valid (obtained from MYX token API)
2. Manual WebSocket signin using `sdk.{token}` format returns `code: 9200` (success)

---

## Evidence from Testing

### Test Results

| Test | Method | Token Source | Result |
|------|--------|--------------|--------|
| 1. Token API | HTTP | MYX auth endpoint | ✅ Token received |
| 2. HTTP listPositions | SDK HTTP | Same token | ✅ Works |
| 3. WS Connect | SDK | - | ✅ Connected |
| 4. SDK `subscription.auth()` | SDK internal | `getAccessToken` callback | ❌ **9401 Unauthorized** |
| 5. Manual WS signin | Direct WebSocket | `sdk.{token}` format | ✅ **9200 Success** |

### Key Log Evidence

```
// Test 4: SDK's auth() fails
LOG  Automatically fetching accessToken...
ERROR  [MYX-SDK-ERROR] Ack Message:signin received {"data": {"code": 9401, "msg": "Unauthorized"}, "type": "signin"}

// Test 5: Same token, manual WebSocket - WORKS!
LOG  Manual WS connected, sending signin with sdk.{token}
LOG  Manual WS response: {"type":"signin","data":{"code":9200}}
```

---

## Reproduction Steps

### 1. Get Valid Token from MYX API

```typescript
const timestamp = Math.floor(Date.now() / 1000);
const payload = `${appId}&${timestamp}&${expireTime}&${address}&${secret}`;
const signature = createHash('sha256').update(payload).digest('hex');
const url = `https://api-beta.myx.finance/openapi/gateway/auth/api_key/create_token?appId=${appId}&timestamp=${timestamp}&expireTime=${expireTime}&allowAccount=${address}&signature=${signature}`;

const response = await fetch(url);
const { data: { accessToken, expireAt } } = await response.json();
// ✅ Token obtained successfully
```

### 2. Create SDK Client with `getAccessToken` Callback

```typescript
const client = new MyxClient({
  chainId: 97,  // BSC Testnet
  brokerAddress: '0x...',
  signer: walletSigner,
  isTestnet: true,
  isBetaMode: true,
  getAccessToken: async () => ({ accessToken, expireAt }),
});
```

### 3. SDK auth() Fails

```typescript
client.subscription.connect();
await client.subscription.auth();  // ❌ Fails with 9401
```

### 4. Manual WebSocket Auth Succeeds with Same Token

```typescript
const ws = new WebSocket('wss://oapi-beta.myx.finance/ws');
ws.onopen = () => {
  ws.send(JSON.stringify({ request: 'signin', args: `sdk.${accessToken}` }));
};
ws.onmessage = (event) => {
  console.log(event.data);  // ✅ {"type":"signin","data":{"code":9200}}
};
```

---

## Analysis

### What the SDK's `auth()` Method Appears to Do

Based on observed behavior:
1. Calls `getAccessToken()` callback
2. Sends signin request to WebSocket
3. BUT something in this flow causes 9401

### Possible SDK Issues

1. **Token format mismatch**: SDK may not be adding `sdk.` prefix correctly
2. **Token caching issue**: SDK's `ConfigManager.clearAccessToken()` may interfere
3. **Timing issue**: SDK may send auth before token is ready
4. **Internal state corruption**: SDK may have stale state from previous auth attempts

### Evidence of SDK Internal Issue

The log shows:
```
LOG  Automatically fetching accessToken...
ERROR  [MYX-SDK-ERROR] Ack Message:signin received {"data": {"code": 9401}}
```

The "Automatically fetching accessToken..." message suggests the SDK is trying to fetch a new token during auth, but something goes wrong internally.

---

## Our Workaround

We bypass `subscription.auth()` and authenticate manually:

```typescript
// In MYXClientService.initialize():
const ws = new WebSocket(wsUrl);
ws.onopen = () => {
  ws.send(JSON.stringify({ request: 'signin', args: `sdk.${token}` }));
};
// Wait for code 9200, then mark as authenticated

// In MYXSubscriptionService.ensureAuthentication():
// Skip SDK's auth() - it fails with 9401
// this.isAuthenticated = true; // Use manual auth from MYXClientService
```

---

## Questions for MYX Team

1. **Is this a known issue with `subscription.auth()`?**
   - Manual signin with same token works, SDK method fails

2. **What is the SDK doing internally in `auth()` that differs from manual signin?**
   - Is there token transformation?
   - Is there internal state that needs to be reset?

3. **Should we use manual WebSocket auth instead of SDK's `auth()` method?**
   - Is this the recommended approach?
   - Are there any downsides?

4. **Is there an SDK update that fixes this?**
   - We're using the latest npm version

---

## Environment

- **SDK**: `@myx-trade/sdk` (latest from npm)
- **Platform**: React Native (MetaMask Mobile)
- **Network**: BSC Testnet (chainId: 97)
- **API Endpoint**: `api-beta.myx.finance`
- **WebSocket**: `wss://oapi-beta.myx.finance/ws`

---

## Attached Test Code

### Full Test Component (MYXServiceDebug.tsx)

The test component that reproduces this issue is available in our codebase. Key sections:

```typescript
// Test 4: SDK auth() - FAILS
const sub = client.subscription;
client.getConfigManager().clearAccessToken();
sub.connect();
await sub.auth();  // ❌ 9401

// Test 5: Manual auth - WORKS
const ws = new WebSocket('wss://oapi-beta.myx.finance/ws');
ws.send(JSON.stringify({ request: 'signin', args: `sdk.${token}` }));  // ✅ 9200
```

---

## Summary

**The bug**: `subscription.auth()` fails even when manual authentication with the same token succeeds.

**Impact**: Cannot use SDK's built-in WebSocket authentication for private subscriptions.

**Workaround**: Manual WebSocket authentication bypassing SDK's `auth()` method.

**Request**: Please investigate why SDK's `auth()` method fails when manual signin works.

---

_Last Updated: 2026-01-21_
_Author: MetaMask Mobile Perps Team_
