# MYX WebSocket Authentication - Documentation Gap Analysis

## Executive Summary

**Status**: ❌ WebSocket authentication not working
**Root Cause**: Missing backend token API documentation
**Action Required**: Contact MYX team for authentication endpoint details

---

## Test Results: ALL CLIENT-SIDE FORMATS FAILED ❌

The multi-format test ran successfully and confirmed that **ALL 7 client-generated token formats** fail with `9401 Unauthorized`:

| Format                   | Token Value                           | Result  |
| ------------------------ | ------------------------------------- | ------- |
| 1. Raw Signature         | `0x{personal_sign_signature}`         | ❌ 9401 |
| 2. Address Only          | `0x{wallet_address}`                  | ❌ 9401 |
| 3. Timestamp:Address     | `{timestamp}:{address}`               | ❌ 9401 |
| 4. JSON Payload          | `{"address":"0x...","timestamp":...}` | ❌ 9401 |
| 5. Base64 JSON           | `base64({address, timestamp})`        | ❌ 9401 |
| 6. Address:Timestamp:Sig | `{addr}:{ts}:{sig}`                   | ❌ 9401 |
| 7. No Token              | `undefined`                           | ❌ 9401 |

---

## Root Cause: **Missing Backend Token API**

### What the SDK Documentation Shows (but doesn't explain)

From `SDK_INTEGRATION_GUIDE_EN_NEW.md` lines 1540-1549:

```typescript
getAccessToken?: () => Promise<{
  code: number;
  msg: string | null;
  data: {
    accessToken: string;
    expireAt: number;
    allowAccount: string;  // ← WHO PROVIDES THIS?
    appId: string;         // ← HOW DO WE GET THIS?
  };
}>;
```

The presence of `allowAccount` and `appId` fields strongly indicates:

1. **Tokens must come from MYX's backend**, not be client-generated
2. There's likely an **HTTP authentication endpoint** we're missing
3. The `appId` suggests **app registration** may be required

### What's NOT Documented

1. ❌ **No authentication endpoint documented** (e.g., `/auth/token`, `/login`)
2. ❌ **No explanation of how to obtain `allowAccount` and `appId`**
3. ❌ **No signature format specification** for wallet-based auth
4. ❌ **No OAuth or session management flow**
5. ❌ **Error code 9401 says "call handleAccessToken()" but doesn't explain what that function should do**

---

## What Works vs What Doesn't

| Feature                      | Status     | Notes                                  |
| ---------------------------- | ---------- | -------------------------------------- |
| Public HTTP API (markets)    | ✅ Works   | No auth needed                         |
| WebSocket connection         | ✅ Works   | Connects successfully                  |
| WebSocket auth()             | ❌ FAILS   | 9401 Unauthorized                      |
| Private HTTP API (positions) | ⚠️ Unclear | Uses `myx_openapi_access_token` header |

---

## Required Action: Contact MYX Team

### Telegram Follow-up Message (Concise)

---

Hi @RyanMYXFinance,

Quick update on our SDK integration progress (v0.1.247):

**Working ✅:**

- Public HTTP API (getPoolSymbolAll, getTickerList, getKlineList)
- getAccountInfo (returns account data)
- WebSocket connection (connects successfully)

**Not working ❌:**

- `subscription.auth()` returns **9401 Unauthorized**
- `listPositions()` and `getOrders()` return "Failed to obtain accessToken"

**The issue:** The SDK requires a `getAccessToken` callback, but we can't find documentation on how to generate a valid token. We tried:

- Wallet signatures (personal_sign)
- Address-based tokens
- JSON/Base64 payloads

All fail with 9401.

**Questions:**

1. Is there a backend endpoint we need to call to get the accessToken? (e.g., `/auth/token`)
2. What format should the token be in?
3. Is `appId` registration required?

Could you share a working code example or point us to the auth documentation?

Thanks!

---

### Full Draft Message (Detailed)

**Subject: WebSocket Authentication Documentation - Error 9401 Unauthorized**

Hi MYX Team,

We are integrating the MYX SDK (`@myx-trade/sdk`) into MetaMask Mobile for perpetual trading. We've successfully connected to:

- ✅ Public HTTP API (markets, pools)
- ✅ WebSocket connection (subscribeTickers works)

However, we're getting **9401 Unauthorized** when calling `subscription.auth()` for private WebSocket channels (orders, positions).

**What we've tried:**
We implemented `getAccessToken` callback returning various token formats:

1. Wallet signature of custom message
2. Plain wallet address
3. JSON payload with address/timestamp
4. Base64 encoded payloads
5. Combined address:timestamp:signature

All return 9401.

**Questions:**

1. **What HTTP endpoint provides the `accessToken` for WebSocket auth?**
   - The SDK docs show `getAccessToken` returning `{ accessToken, expireAt, allowAccount, appId }` but don't explain where this data comes from.

2. **Is `appId` required? How do we register for one?**
   - The type definition includes `appId: string` - do we need to register our app with MYX?

3. **What authentication flow is expected?**
   - Wallet signature → Your backend → Token?
   - Or direct client-side token generation?

4. **If wallet signature is required, what message format?**
   - EIP-712 typed data?
   - Plain text with specific format?
   - SIWE (Sign-In with Ethereum)?

5. **Can you provide a working code example?**
   - How does the MYX web app authenticate WebSocket connections?

**Our setup:**

- SDK version: Latest from npm
- Network: BSC Mainnet (chainId: 56)
- Environment: React Native (MetaMask Mobile)

Any documentation or code samples would be greatly appreciated.

Thanks!

---

### Questions to Ask MYX

1. **What HTTP endpoint provides the `accessToken` for WebSocket authentication?**
   - Is it `/auth/token`, `/login`, or something else?
   - What parameters does it require?

2. **What is `appId` and how do we get one?**
   - Is app registration required?
   - Do we need API keys?

3. **What authentication method is supported?**
   - Wallet signature + message?
   - OAuth?
   - API key + secret?

4. **What is the expected signature message format?**
   - Is it EIP-712 typed data?
   - Plain text with specific format?
   - SIWE (Sign-In with Ethereum)?

5. **Is there a staging/sandbox environment for testing?**

---

## Technical Implementation Status

### Files Modified (for testing)

| File                                                   | Status                                     |
| ------------------------------------------------------ | ------------------------------------------ |
| `app/components/UI/Perps/Debug/MYXAuthDebug.tsx`       | ✅ Updated with HTTP API + WS auth testing |
| `app/components/UI/Perps/Debug/MYXAuthDebug.styles.ts` | ✅ Updated with format selector styles     |

### Debug Tool Features

**Test Mode Toggle:**

- **HTTP API Mode**: Tests public and private HTTP endpoints
- **WS Auth Mode**: Tests WebSocket authentication with different token formats

**HTTP API Tests:**

1. `getPoolSymbolAll()` - Public endpoint, lists available trading pools
2. `getTickerList()` - Public endpoint, gets price tickers
3. `getKlineList()` - Public endpoint, gets historical candles
4. `listPositions()` - Private endpoint, requires auth
5. `getOrders()` - Private endpoint, requires auth
6. `getAccountInfo()` - Private endpoint, requires auth

**WS Auth Tests:**

- Format selector UI with 7 token formats
- "Test Single Format" button
- "Test ALL Formats" button (auto-stops on success)

**Common Features:**

- Detailed logging with timestamps
- Network toggle (testnet/mainnet)
- Console output for easy debugging

---

## Investigation Strategies

### 1. Analyze MYX Web App (Browser DevTools)

Open the MYX web app and use browser developer tools to capture:

```javascript
// In browser console, intercept WebSocket messages:
const originalWS = window.WebSocket;
window.WebSocket = function (...args) {
  const ws = new originalWS(...args);
  const originalSend = ws.send.bind(ws);
  ws.send = function (data) {
    console.log('WS SEND:', data);
    return originalSend(data);
  };
  ws.addEventListener('message', (e) => {
    console.log('WS RECV:', e.data);
  });
  return ws;
};
```

Look for:

- Authentication messages sent after WebSocket connection
- HTTP requests to auth endpoints before WebSocket connection
- The format of the access token being used

### 2. Network Tab Analysis

In Chrome DevTools Network tab:

1. Filter by "Fetch/XHR"
2. Look for any requests containing "auth", "token", "login"
3. Check request/response headers and bodies
4. Look for `myx_openapi_access_token` header value source

### 3. Check for Hidden API Documentation

- Search MYX GitHub repositories for authentication examples
- Look for OpenAPI/Swagger specs
- Check if there's a developer portal we missed

---

## Temporary Workaround Options

If MYX team is slow to respond:

### Option 1: HTTP-Only Mode

Use private HTTP API only (skip WebSocket private channels):

```typescript
// Poll for positions/orders via HTTP instead of WebSocket subscription
const pollInterval = setInterval(async () => {
  const positions = await httpClient.getPositions(account);
  const orders = await httpClient.getOpenOrders(account);
  updateState({ positions, orders });
}, 5000); // Poll every 5 seconds
```

**Pros:**

- Can still get positions, orders
- HTTP auth might work differently

**Cons:**

- Lose real-time updates for private data
- Higher latency for order status changes
- More API calls (rate limiting concerns)

### Option 2: Public WebSocket Only

Subscribe to tickers, klines only (no auth needed):

```typescript
// These work without authentication
subscription.subscribeTickers(['BTC-USDT', 'ETH-USDT']);
subscription.subscribeKlines('BTC-USDT', '1m');

// Trade execution via HTTP (may have different auth)
const result = await httpClient.placeOrder(orderParams);
```

**Pros:**

- Market data works perfectly
- Trade execution possible via HTTP

**Cons:**

- No real-time order/position updates via WebSocket
- Need separate polling for user data

### Option 3: Hybrid Approach (Recommended)

```typescript
class MYXHybridProvider {
  // Real-time market data via WebSocket (no auth needed)
  async subscribeMarketData() {
    this.subscription.subscribeTickers(this.markets);
    this.subscription.subscribeKlines(this.currentMarket, this.interval);
  }

  // User data via HTTP polling (until WS auth is figured out)
  async startUserDataPolling() {
    this.pollTimer = setInterval(async () => {
      try {
        const [positions, orders] = await Promise.all([
          this.fetchPositionsHTTP(),
          this.fetchOpenOrdersHTTP(),
        ]);
        this.emit('positionsUpdate', positions);
        this.emit('ordersUpdate', orders);
      } catch (error) {
        console.error('User data poll failed:', error);
      }
    }, 3000);
  }

  // Trade execution via HTTP
  async placeOrder(params: OrderParams) {
    return this.httpClient.placeOrder(params);
  }
}
```

---

## Code Reference: Current Implementation

### MYXClientService.ts - getAccessToken Implementation

```typescript
// Current implementation in MYXClientService.ts
private async getAccessToken(): Promise<MYXAccessTokenResponse> {
  const address = this.currentAccount;
  if (!address) {
    throw new Error('No account connected');
  }

  // Generate signature using the connected wallet
  const timestamp = Date.now();
  const message = `MYX Authentication\nAddress: ${address}\nTimestamp: ${timestamp}`;

  const signature = await this.signMessage(message);

  // THIS IS THE PROBLEM: We don't know what format MYX expects
  // or if there's a backend endpoint we should call
  return {
    code: 0,
    msg: null,
    data: {
      accessToken: signature,  // ❌ Just the signature doesn't work
      expireAt: timestamp + 3600000,
      allowAccount: address,
      appId: 'metamask-mobile',  // ❌ We don't have a real appId
    },
  };
}
```

---

## SDK Source Code Analysis

### Key SDK Files to Examine

If SDK source is available:

1. **Subscription class** - How does it use `getAccessToken`?
2. **Auth message format** - What does it send to the WebSocket?
3. **Error handling** - What triggers 9401?

### Decompiled/Bundled Code Hints

From the SDK behavior:

- `auth()` method calls `getAccessToken` callback
- Sends auth message to WebSocket server
- Server validates and returns success/failure
- 9401 = "Unauthorized" = token validation failed

---

## Timeline and Priority

| Task                    | Priority  | Status             |
| ----------------------- | --------- | ------------------ |
| Contact MYX team        | 🔴 HIGH   | Pending            |
| Analyze MYX web app     | 🟡 MEDIUM | Not started        |
| Implement HTTP fallback | 🟢 LOW    | Can do in parallel |
| Search for hidden docs  | 🟡 MEDIUM | Not started        |

---

## Conclusion

**This is a documentation gap on MYX's side.** The SDK provides a `getAccessToken` callback but doesn't document:

- Where to get the token
- What format it should be
- How to authenticate with their backend

The test confirms client-side signature generation doesn't work. We need MYX to provide:

1. Auth endpoint documentation
2. Required parameters/credentials (including `appId`)
3. Token format specification
4. Working code example

---

## Appendix: Test Output Example

```
[2025-01-20 10:30:15] Testing format: Raw Signature
[2025-01-20 10:30:15] Token: 0x4f8e...a3b2
[2025-01-20 10:30:16] Result: ❌ 9401 Unauthorized

[2025-01-20 10:30:17] Testing format: Address Only
[2025-01-20 10:30:17] Token: 0x1234...5678
[2025-01-20 10:30:18] Result: ❌ 9401 Unauthorized

... (all 7 formats failed)

[2025-01-20 10:30:30] ALL FORMATS FAILED
[2025-01-20 10:30:30] Conclusion: Server-side token generation required
```

---

## Contact Information

**MYX Support Channels to Try:**

- Discord: [MYX Discord Server]
- Telegram: [MYX Telegram Group]
- Email: support@myx.finance (if available)
- GitHub Issues: [MYX SDK Repository]

---

_Last Updated: 2025-01-20_
_Author: MetaMask Mobile Perps Team_
