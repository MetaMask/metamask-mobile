# Upgrading @metamask/providers to v22.1.0

## What I'm Doing and Why

I'm updating `@metamask/providers` from v18.3.1 to v22.1.0. This update requires adopting ES modules and the newer streaming patterns used in the latest version.

## Changes Made

1. **Updated imports to ES modules**
   - Switched from `require('@metamask/object-multiplex')` to `import from`
   - Replaced `pump` with `pipeline` from readable-stream

2. **Updated readable-stream (v2.3.7 → v3.6.2)**
   - This provides the `pipeline` function (Node.js standard replacement for `pump`)
   - Matches what metamask-extension uses

## Is This Safe?

Despite being a major version upgrade of readable-stream, the risk is low because:

- We only use it for `Duplex` streams and React Native polyfills
- Our stream implementations are simple and don't override core methods
- The polyfill mappings in package.json remain valid in v3
- MetaMask extension already uses v3.6.2 successfully

## Benefits

- Modern ES module patterns improve maintainability
- Standard `pipeline` function aligns with Node.js practices
- We get performance improvements and bug fixes from the provider update
- Better TypeScript support from updated types

## Testing Focus

Since we're upgrading readable-stream, we should primarily test:
- Communication between the app and web pages
- Inpage bridge functionality
- Snap integrations (which rely on streaming)

This approach represents the minimal changes needed while ensuring compatibility with the latest provider package. The changes are intentionally limited to just what's necessary to get things working with the updated packages.
