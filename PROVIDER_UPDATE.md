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
