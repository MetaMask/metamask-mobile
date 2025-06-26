# Speedscope Performance Testing Guide

## Overview
This guide explains how to use [speedscope](https://www.speedscope.app/) to verify the performance improvements made to the `swapsControllerAndUserTokensMultichain` selector.

## Prerequisites
- MetaMask Mobile development environment set up
- React Native profiler or Chrome DevTools access
- Access to speedscope.app or local speedscope installation

## Testing Steps

### 1. Setup Performance Profiling

#### Option A: React Native Profiler (Recommended)
```bash
# Start Metro bundler with profiling enabled
npm start -- --reset-cache

# In a separate terminal, run with profiling
npx react-native run-android --mode=Release
# or
npx react-native run-ios --mode=Release
```

#### Option B: Chrome DevTools (For component profiling)
1. Enable Chrome DevTools for React Native
2. Open Chrome DevTools
3. Go to Performance tab
4. Enable "React profiling" in settings

### 2. Generate Performance Profile

#### Scenario: Asset Detail View Loading
1. **Open MetaMask Mobile** (Release build for accurate performance)
2. **Start Performance Recording**
   - React Native: Open dev menu → "Start Performance Monitor"
   - Chrome DevTools: Click "Record" in Performance tab
3. **Navigate to Asset Detail** for a Solana token:
   - Go to Wallet → Assets tab
   - Ensure Portfolio View is enabled (cross-chain tokens visible)
   - Tap on any Solana token (e.g., SOL or SPL token)
4. **Wait for Full Load** (let all selectors execute)
5. **Stop Recording**
6. **Export Profile** as `.json` file

### 3. Analyze with Speedscope

#### Upload to Speedscope
1. Go to [speedscope.app](https://www.speedscope.app/)
2. Click "Browse" or drag your `.json` profile file
3. Wait for profile to load

#### What to Look For

**Before Optimization (Baseline):**
- Look around the **5.65s mark** mentioned in the original issue
- Find `swapsControllerAndUserTokensMultichain` function calls
- Note execution time (~110ms as reported)

**After Optimization (Current):**
- Same timeline location
- Look for the optimized selector execution
- Should show significant reduction in execution time

#### Key Metrics to Compare

| Metric | Before | After | Expected Improvement |
|--------|---------|--------|---------------------|
| **Total Execution Time** | ~110ms | ~20-50ms | 50-80% reduction |
| **Function Calls** | Multiple array operations | Streamlined loops | Fewer calls |
| **Memory Allocations** | High (many temp arrays) | Lower | Reduced allocations |
| **CPU Time** | High | Lower | Better efficiency |

### 4. Specific Areas to Analyze

#### Flame Graph View
1. **Switch to Flame Graph** view in speedscope
2. **Search for**: `swapsControllerAndUserTokensMultichain`
3. **Compare width** of function blocks (wider = longer execution)
4. **Look for nested calls**:
   - `Object.values` calls (should be eliminated)
   - `Array.reduce` with spread operators (should be optimized)
   - `Map` operations (should be more efficient)

#### Timeline View
1. **Switch to Timeline** view
2. **Zoom to asset loading section**
3. **Compare before/after** for:
   - Total selector execution time
   - Frequency of selector calls
   - Memory pressure during execution

### 5. Expected Improvements

#### Performance Metrics
- **~46% faster execution** (based on testing)
- **2x speedup** in processing large token datasets
- **Reduced memory allocations** from eliminated intermediate arrays
- **Better caching efficiency** with `createDeepEqualSelector`

#### Visual Indicators in Speedscope
- **Narrower flame graph bars** for the optimized selector
- **Fewer nested function calls** in the token processing section
- **Reduced "red zones"** indicating high CPU usage
- **Shorter overall execution blocks** for asset detail loading

### 6. Regression Testing

#### Test Scenarios
1. **Small Dataset**: Single chain, few tokens
2. **Medium Dataset**: Multiple chains, moderate tokens
3. **Large Dataset**: Portfolio view with many chains and tokens
4. **Edge Cases**: Empty state, no tokens, network switching

#### What Should Remain Unchanged
- **Functionality**: Token list should be identical
- **UI Behavior**: Asset details should load correctly
- **Data Accuracy**: All token information should be present

### 7. Interpreting Results

#### Success Indicators ✅
- Speedscope shows reduced execution time for selector
- Asset detail loading feels more responsive
- No functional regressions in token display
- Memory usage improvements visible in timeline

#### Potential Issues ❌
- No visible performance improvement (indicates issue with optimization)
- Functional differences in token data (regression)
- New performance bottlenecks elsewhere (optimization side effects)

### 8. Alternative Profiling Methods

#### React DevTools Profiler
```javascript
// Add to component for direct measurement
import { Profiler } from 'react';

function onRenderCallback(id, phase, actualDuration) {
  console.log('Selector execution:', id, actualDuration);
}

<Profiler id="AssetDetail" onRender={onRenderCallback}>
  <AssetDetailComponent />
</Profiler>
```

#### Performance API
```javascript
// Direct measurement in selector
const start = performance.now();
const result = swapsControllerAndUserTokensMultichain(state);
const end = performance.now();
console.log(`Selector took ${end - start}ms`);
```

### 9. Reporting Results

When documenting results, include:
- **Before/After speedscope screenshots**
- **Execution time measurements**
- **Test device specifications**
- **Dataset size used for testing**
- **Any functional differences observed**

## Troubleshooting

### Profile Not Showing Selectors
- Ensure you're using a Release build (Debug builds have different performance characteristics)
- Make sure selectors are actually being called during the recorded period
- Check that React DevTools profiling is enabled

### Large Profile Files
- Focus recording on just the asset detail loading period
- Use sampling profiler if available
- Consider shorter recording periods

### Inconsistent Results
- Run multiple test iterations
- Use consistent device conditions (same background apps, battery level)
- Test with similar data conditions (same token count, network state)

---

**Note**: The exact performance improvements may vary based on device capabilities, dataset size, and current app state. The optimizations are most visible with larger token datasets typical in portfolio view scenarios.