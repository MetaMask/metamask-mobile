# PerpsController Testing Guide

This directory contains the PerpsController implementation for MetaMask Mobile, providing a protocol-agnostic abstraction layer for perpetual futures trading.

## Quick Testing Access

### How to Access the Testing Page

1. **Open MetaMask Mobile** (development build)
2. **Navigate to Wallet View** (main wallet screen)
3. **Open Wallet Actions** (tap the action buttons/bottom sheet)
4. **Look for "Perps" button** (feature must be enabled)
5. **Tap "Perps"** to access the comprehensive testing page

### Alternative Access (if Perps button not visible)

The Perps feature might be behind a feature flag. Check the feature flag configuration to enable it.

## Testing Capabilities

### 🔧 SDK Testing (Direct HyperLiquid SDK)
- **Test SDK Connection** - Validates HTTP transport and InfoClient
- **Test Asset Listing** - Retrieves available trading assets
- **Test WebSocket Connection** - Tests real-time data subscription

### 🎮 PerpsController Testing (Abstraction Layer)
- **Test PerpsController** - Comprehensive controller validation
- **Test Market Order** - Places a market buy order for 0.01 ETH
- **Test Limit Order** - Places a limit buy order for 0.01 ETH at $2500
- **Test Deposit Funds** - Tests deposit functionality
- **Toggle Network** - Switches between testnet/mainnet
- **Test Live Data Subscriptions** - Validates real-time price feeds

### 📊 Live Data Features
- **Real-time Prices** - ETH and BTC price updates via WebSocket
- **Position Monitoring** - Live P&L updates
- **Order Fill Notifications** - Immediate execution feedback

## What to Test for Migration

To validate moving away from direct HyperLiquid SDK usage to PerpsController:

### 1. Basic Functionality
✅ Test PerpsController connection and data retrieval
✅ Verify all trading operations work through the abstraction
✅ Confirm live data subscriptions work properly

### 2. Trading Operations
✅ Place market orders using human-readable API
✅ Place limit orders with proper type transformation
✅ Test deposit/withdrawal flows

### 3. Performance Validation
✅ Live data updates (should be smooth and fast)
✅ Order execution speed
✅ Network switching

### 4. Error Handling
✅ Network failures
✅ Invalid parameters
✅ SDK errors properly abstracted

## Architecture Benefits

### Human-Readable API
```typescript
// PerpsController API (Human-readable)
await placeOrder({
  coin: "ETH",
  isBuy: true,
  size: "0.1",
  orderType: "market"
});

// vs Direct SDK (Cryptic)
await exchangeClient.order({
  orders: [{
    a: 0,  // asset ID
    b: true,  // is buy
    s: "0.1",  // size
    t: { limit: { tif: "Ioc" } }  // order type
  }]
});
```

### Success Criteria

When these tests pass consistently, you can confidently migrate away from direct SDK usage:

1. ✅ All PerpsController tests pass
2. ✅ Live data subscriptions work smoothly  
3. ✅ Order placement/cancellation functions correctly
4. ✅ Network switching works properly
5. ✅ Error handling is robust
6. ✅ Performance meets expectations

## Integration Status

✅ **PerpsController** - Fully implemented with human-readable API  
✅ **HyperLiquid SDK Integration** - Complete with adapter pattern  
✅ **React Hooks** - All trading operations and live data  
✅ **Navigation** - Integrated into MetaMask navigation  
✅ **Engine Integration** - Added to MetaMask Engine context  
✅ **Type Safety** - No TypeScript errors, proper typing throughout  
✅ **Testing Page** - Comprehensive validation interface  

The PerpsController is ready for production use as a replacement for direct HyperLiquid SDK usage.
