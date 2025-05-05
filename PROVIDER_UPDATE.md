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

## Current Issues

### 1. ObjectMultiplex Stream Duplication Error
The primary error is:
```
Uncaught (in promise) Error: ObjectMultiplex - Substream for name "metamask-provider" already exists
```

This occurs because we're trying to create multiple streams with the same name on the same multiplexer instance:

```javascript
// First creation - successful
const providerStream = mux.createStream(METAMASK_EIP_1193_PROVIDER);

// Later - fails with the error
const pageProviderChannel = mux.createStream(METAMASK_EIP_1193_PROVIDER);
```

### 2. Communication Issues
- The debug logs show SYN messages being sent repeatedly, indicating connection establishment issues
- Target/origin mismatches in PostMessageStream communications
- Message routing problems between inpage and content script contexts

### 3. Connection Flow
Current debug logs show:
1. Provider bridge initialization
2. PostMessageStream creation and SYN messages sent
3. Provider streams setup attempted 
4. Error at multiplex stream creation
5. Continuous retries for connection

## Proposed Solutions

### 1. Fix Stream Duplication
Modify `provider.js` to reuse the existing `providerStream` instead of creating a new one:

```javascript
// INSTEAD OF:
const pageProviderChannel = mux.createStream(METAMASK_EIP_1193_PROVIDER);

// USE:
// Reuse the providerStream created earlier
```

Then update the pipeline connection to:

```javascript
pipeline(
  providerStream,
  appProviderChannel,
  providerStream,
  (err) => logStreamDisconnectWarning(...)
);
```

### 2. Ensure Consistent Naming
- Use the same constant `METAMASK_EIP_1193_PROVIDER` consistently across all modules
- Ensure target/name consistency in PostMessageStream and MobilePortStream implementations

### 3. Review Message Routing
- Verify the message routing between inpage <-> content script <-> background
- Ensure proper origin and target handling in message stream implementations
- Review SYN/ACK handshake mechanism which appears to be failing

### 4. Improve Developer Experience
- Create a development build mode that doesn't rely on full `yarn setup` for provider changes
- Consider implementing direct Metro aliasing instead of using rn-nodeify
- Add a watch mode for the inpage bridge that recompiles on changes

## Next Steps
1. Apply the stream duplication fix
2. Test with a DApp that uses provider methods
3. Verify that the communication channels are properly established
4. Analyze message flow with debug logs to ensure proper routing
5. Consider refactoring the stream creation pattern to avoid multiplexer naming conflicts
6. Begin migration away from rn-nodeify for faster development iteration

## Reference Implementation
The updated implementation mirrors patterns used in metamask-extension while ensuring backward compatibility with existing RPC middleware and snap functionality.
