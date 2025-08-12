> NOTE: The current state of this document might not reflect the latest implementation. The idea is for the team to keep this file up to date as we implement this feature.

# Prediction Markets (Draft)

## Architecture Layers

```
┌─────────────────────────────────────┐
│         Components (UI)             │
├─────────────────────────────────────┤
│          Hooks (React)              │
├─────────────────────────────────────┤
│       Controller (Business)         │
├─────────────────────────────────────┤
│        Provider (Protocol)          │
└─────────────────────────────────────┘
```

## File Structure

```
/Predict
├── /components    # UI components
├── /constants     # Config values
├── /controllers   # Business logic
├── /hooks         # React integration
├── /providers     # Protocol implementations
├── /routes        # Route definitions
├── /types         # TypeScript definitions
└── /utils         # Helper functions
```

## Hooks - Categorized to prevent duplication

### Controller Access

- `usePredictTrading` - Trading ops (buy/sell/claimWinnings)
- `usePredictMarkets` - Market data

### State Management

- `usePredictPositions` - Position list

### Live Data (WebSocket)

- `usePredictPrices` - Real-time prices

### Calculations

- `usePredictOrderFees` - Fee calc

### Form Management

- `usePredictOrderForm` - Order form state

### Special Purpose

- `usePredictEligibility` - User eligibility check (geo-fencing)

## Duplication Prevention

Before creating a new hook:

1. Check existing hooks in relevant category
2. Consider composing existing hooks
3. Follow naming: `usePredict[Feature][Action]`
4. Keep single responsibility

## Key Patterns

### Validation Flow

Provider validation (protocol rules) → Hook adds UI rules → Component displays errors

### Data Flow

Controller → Redux Store → Hooks → Components

### Real-time Updates

WebSocket → Controller → Redux → Hooks with subscription

### Form Management

Component input → Hook state → Validation → Controller action

## Quick Hook Selection Guide

| Need           | Use Hook              |
| -------------- | --------------------- |
| Place order    | `usePredictTrading`   |
| Get prices     | `usePredictPrices`    |
| Manage form    | `usePredictOrderForm` |
| Calculate fees | `usePredictOrderFees` |
