# MetaMask Mobile Provider Update

## Overview
This document outlines the changes made while updating the `@metamask/providers` package from v18.3.1 to v22.1.0 in MetaMask Mobile, including current issues and proposed solutions.

## Changes Made

### Package Updates
- Updated `@metamask/providers` from v18.3.1 to v22.1.0
- Migrated from CommonJS to ES modules imports for ObjectMultiplex
- Replaced `pump()` with `pipeline()` from readable-stream
- Upgraded readable-stream from v2.3.7 to v3.6.2

### Implementation Changes
- Updated webpack.config.js paths to use `readable-stream/lib/_stream_*` structure (required for v3)
- Updated polyfill mappings in package.json for React Native compatibility
- Created consistent EIP-1193 provider channel name constant (`METAMASK_EIP_1193_PROVIDER`)
- Added extensive debug logging throughout the connection flow

## Build Process & Development Challenges

### Build Flow
1. The provider code in `scripts/inpage-bridge/src/provider.js` is compiled via `webpack.config.js`
2. During the build process (`yarn setup`), `setup.mjs` calls `build-inpage-bridge.sh`
3. This generates `app/core/InpageBridgeWeb3.js`, which is injected into the browser's WebView
4. The provider executes in the WebView context, not directly in React Native

### Development Challenges
- **Slow Debugging Cycle**: Every change to the provider requires re-running `yarn setup`, making the debugging process extremely time-consuming
- **rn-nodeify Dependency**: After setup, `rn-nodeify` modifies files in the `node_modules` folder
- **No Direct Editing**: Cannot directly edit the generated `InpageBridgeWeb3.js` file because subsequent `rn-nodeify` passes will overwrite changes
- **Complex Communication Flow**: The multi-layered stream architecture makes tracing issues difficult

### Suggested Improvements
- **Metro Aliasing**: Migrate away from `rn-nodeify` to use Metro bundler's aliasing capabilities directly
- **Development Mode**: Create a development mode that allows for faster iteration on provider changes

## Communication Flow Architecture

### Key Files and Components
- `BrowserTab.tsx`: Renders the WebView and injects the provider scripts
- `ReactNativePostMessageStream.js`: Implements the message transport between contexts using a SYN/ACK handshake
- `BackgroundBridge.ts`: Connects the WebView to the provider backend
- `MobilePortStream.js`: Handles messaging between inpage script and native code
- `streams.js`: Contains utility functions for stream creation and transformation

### SYN/ACK Handshake Mechanism
The communication between the in-app browser and the provider relies on a SYN/ACK handshake protocol:

1. **Initialization**:
   - When a PostMessageStream is created, it sets `_init = false` and `_haveSyn = false` 
   - It immediately sends a "SYN" message and calls `this.cork()` to buffer any writes

2. **Handshake Process**:
   - When receiving a "SYN" message, the other end sets `_haveSyn = true` and responds with "ACK"
   - When receiving an "ACK", it sets `_init = true` and calls `this.uncork()` to allow message flow
   - Only after `_init = true` will actual messages be processed

3. **Connection Flow**:
   - WebView loads dApp → EntryScriptWeb3 injects provider → PostMessageStream created
   - Stream sends SYN → BackgroundBridge receives → responds with ACK
   - Handshake completes → communication channel established
   - ObjectMultiplex creates named streams over this connection

This handshake ensures both sides of the communication are ready before RPC messages flow, preventing message loss during initialization.

### Message Routing Issues Identified in Logs
Analysis of the debug logs reveals several specific communication problems:

1. **Target Mismatches**: The most frequent error seen in logs is:
   ```
   [METAMASK-DEBUG] PostMessageStream message target mismatch: expected=metamask-inpage, got=metamask-contentscript
   ```
   - Both streams (inpage and contentscript) receive all postMessage events from the window
   - Each validates the target field to determine if the message is for them
   - The logs show messages are consistently being rejected due to incorrect target field

2. **One-Way Communication**: Messages flow from dApp to native code but not back:
   - RPC requests like `eth_accounts` are sent from inpage → contentscript
   - MobilePortStream correctly adds the `toNative` flag and forwards to ReactNativeWebView
   - When messages return from native code, they're filtered out:
   ```
   [METAMASK-DEBUG] InpageBridge MobilePortStream: ignoring outgoing message: {method: 'eth_accounts', ... toNative: true}
   ```
   - No responses are ever delivered back to the dApp

3. **SYN/ACK Partial Completion**: The handshake completes but:
   - Inpage and contentscript streams successfully exchange SYN/ACK
   - Both streams uncork and begin accepting messages
   - However, the multiplexed provider subchannel communication fails

4. **Inconsistent Message Format**: The message structure changes as it passes through layers:
   - Different wrapping formats between postMessage streams and MobilePortStream
   - The origin field is added in some contexts but not in others
   - The direction of the message is tracked via toNative flag but may be causing confusion

## Message Format Issue with ObjectMultiplex

After implementing the updated providers package, a new issue was identified in the communication between the MobilePortStream and ObjectMultiplex:

### Problem Description
- Messages passing through MobilePortStream are being rejected by ObjectMultiplex with:
  ```
  ObjectMultiplex - malformed chunk without name "[object Object]"
  ```
- The logs show that the data structure being pushed to ObjectMultiplex is not in the format it expects

### Technical Details
1. MobilePortStream receives messages like:
   ```json
   {"target":"metamask-contentscript","data":{"name":"metamask-provider","data":{"method":"eth_accounts", "jsonrpc":"2.0", "id":1234}}}
   ```

2. But ObjectMultiplex expects messages in the format:
   ```json
   {"name":"metamask-provider","data":{"method":"eth_accounts", "jsonrpc":"2.0", "id":1234}}
   ```

3. This format mismatch happens because:
   - The updated `@metamask/providers` package uses a different message format structure
   - The MobilePortStream didn't properly transform messages to match the expected structure

## Complete Message Path Analysis

The critical issue identified is not just in the outgoing request path, but in the response path back to the dApp. Here's the complete flow:

### Outgoing Request Path (Working)
1. **Inpage Provider** (inside WebView) creates a JSON-RPC request:
   ```js
   {"method":"eth_requestAccounts","params":[],"jsonrpc":"2.0","id":844123027}
   ```

2. **PostMessageStream** in inpage wraps and sends to contentscript:
   ```js
   {"name":"metamask-provider","data":{"method":"eth_requestAccounts","params":[],"jsonrpc":"2.0","id":844123027}}
   ```

3. **PostMessageStream** in contentscript receives and forwards to MobilePortStream:
   ```js
   {"name":"metamask-provider","data":{"method":"eth_requestAccounts","params":[],"jsonrpc":"2.0","id":844123027}}
   ```

4. **MobilePortStream** adds toNative flag and sends to ReactNativeWebView:
   ```js
   {"target":"metamask-contentscript","data":{"name":"metamask-provider","data":{"method":"eth_requestAccounts","params":[],"jsonrpc":"2.0","id":844123027,"toNative":true}},"origin":"https://portfolio.metamask.io/explore/tokens"}
   ```

5. **BrowserTab.onMessage** in React Native receives and passes to BackgroundBridge:
   ```js
   {"name":"metamask-provider","data":{"method":"eth_requestAccounts","params":[],"jsonrpc":"2.0","id":844123027,"toNative":true}}
   ```

6. **BackgroundBridge.onMessage** sends to the JsonRpcEngine, which processes through middleware

### Response Path (Breaking)
7. **JsonRpcEngine** generates a response but we never see it in the WebView logs:
   ```js
   {"id":844123027,"jsonrpc":"2.0","result":["0x..."]}
   ```

8. **BackgroundBridge** should wrap the response with name and send it to Port.postMessage
   ```js
   {"name":"metamask-provider","data":{"id":844123027,"jsonrpc":"2.0","result":["0x..."]}}
   ```

9. **Port.postMessage** should inject a script into the WebView via:
   ```js
   window.postMessage({"name":"metamask-provider","data":{"id":844123027,"jsonrpc":"2.0","result":["0x..."]}}, '*');
   ```

10. **PostMessageStream** in the contentscript should receive the message and forward it
    ```js
    {"name":"metamask-provider","data":{"id":844123027,"jsonrpc":"2.0","result":["0x..."]}}
    ```

11. **ObjectMultiplex** in the contentscript should route to the metamask-provider stream
    ```js
    {"id":844123027,"jsonrpc":"2.0","result":["0x..."]}
    ```

12. **Provider in inpage** should receive the response and resolve the Promise

### The Missing Link - Step 8-9
The critical issue appears to be in the BackgroundBridge.onMessage method, which is not correctly handling responses. The logs show requests reach step 6, but we never see steps 7-12 in the logs. This indicates one of these issues:

1. The request is not being passed to the JsonRpcEngine at all
2. The JsonRpcEngine is not generating a response
3. BackgroundBridge is not properly wrapping and forwarding the response back to the WebView
4. The Port.postMessage method is not successfully injecting the script into the WebView
5. The injected script is not correctly structured to post the message back to the WebView

## Solution: Fix Response Handling in BackgroundBridge

Our solution needs to focus on ensuring the response path works correctly. The key points to address:

1. When BackgroundBridge receives a request from the WebView, it should:
   - Pass it to the JsonRpcEngine
   - When the JsonRpcEngine responds, properly wrap the response with the correct name
   - Send the wrapped response back to the WebView via Port.postMessage

2. The changes we made to MobilePortStream to handle message transformation are crucial for the request path, but we also need to fix the response path in BackgroundBridge.

3. Additional changes to ensure proper target routing:
   - Ensure the response is sent back with the correct target (metamask-inpage)
   - Properly format the response to include all required fields expected by the inpage provider

## Next Steps for Implementation

1. Add logging in the BackgroundBridge.js onMessage method to see if requests are passed to the engine
2. Add logging in the JsonRpcEngine middleware to see if responses are generated
3. Fix the BackgroundBridge.onMessage method to properly wrap and forward responses
4. Ensure that Port.postMessage correctly injects a script with the right structure

## Future Improvements

For a more robust solution, consider:

1. Refactoring the message passing layer to use a standardized format across all layers
2. Implementing formal JSON-RPC middleware in both directions
3. Using typed interfaces for message passing to catch format mismatches at compile time
4. Implementing comprehensive message structure validation

## Lessons Learned

### Strict Message Format Requirements
The upgrade from `@metamask/providers` v18 to v22 made the message format validation more strict, particularly in how ObjectMultiplex expects messages to be structured. When upgrading provider packages, special attention should be paid to format requirements of the underlying stream components.

### Bidirectional Communication Challenges
Messages flowing between contexts (inpage, contentscript, native) may undergo transformation at each layer. Maintaining consistent structure and proper targeting throughout this flow is essential for successful communication. Debugging logs at each layer are invaluable for tracing message flow issues.

### Response Format Variability
Response messages from the native layer may not follow the same structure as request messages. Flexible handling of response formats ensures robust communication even when the native implementation sends responses in an unexpected format.
