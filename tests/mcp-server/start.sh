#!/bin/bash
cd "$(dirname "$0")/../.."
# Use register.js to stub detox/react-native, then tsx for TS compilation + ESM support
NODE_OPTIONS="--require ./tests/mcp-server/register.js" exec npx tsx tests/mcp-server/index.ts
