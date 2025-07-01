# 🎯 Performance Quality Gates

This document outlines the performance thresholds (quality gates) for MetaMask Mobile's critical user flows. These thresholds ensure optimal user experience across different platforms and scenarios.

## 📱 Platform Overview

- **Android**: Generally has higher thresholds due to platform constraints
- **iOS**: Lower thresholds leveraging platform optimizations
- **Quality Gates**: Hard limits that cause test failures if exceeded

---

## 🏠 Account List Performance Tests

### Test: `render account list efficiently with multiple accounts and networks w/profile syncing`
**Configuration**: 16 accounts, popular networks, profile syncing enabled

| Platform | Navigation Time | Render Time | Total Max Time |
|----------|----------------|-------------|----------------|
| **Android** | 2,500ms | 35,000ms | 37,500ms |
| **iOS** | 1,500ms | 5,000ms | 6,500ms |

---

### Test: `handle account list performance with heavy token load w/profile syncing`
**Configuration**: 16 accounts, popular networks, 50 tokens, profile syncing enabled

| Platform | Navigation Time | Render Time | Total Max Time |
|----------|----------------|-------------|----------------|
| **Android** | 2,500ms | 35,000ms | 37,500ms |
| **iOS** | 3,000ms | 8,000ms | 11,000ms |

---

### Test: `render account list efficiently with multiple accounts and networks (profile syncing disabled)`
**Configuration**: 11 accounts, popular networks, profile syncing disabled

| Platform | Navigation Time | Render Time | Total Max Time |
|----------|----------------|-------------|----------------|
| **Android** | 2,500ms | 15,000ms | 17,500ms |
| **iOS** | 1,500ms | 5,000ms | 6,500ms |

---

### Test: `handle account list performance with heavy token load (profile syncing disabled)`
**Configuration**: 11 accounts, popular networks, 50 tokens, profile syncing disabled

| Platform | Navigation Time | Render Time | Total Max Time |
|----------|----------------|-------------|----------------|
| **Both** | 3,000ms | 8,000ms | 11,000ms |

---

### Test: `benchmark account list with minimal load`
**Configuration**: 2 accounts, default network, 2 tokens

| Platform | Total Max Time | Notes |
|----------|----------------|--------|
| **Both** | 3,000ms | Baseline measurement |

---

## 🌐 Network List Performance Tests

### Test: `render network list efficiently with multiple accounts and all popular networks w/profile syncing`
**Configuration**: 16 accounts, popular networks, profile syncing enabled

| Platform | Navigation Time | Render Time | Total Max Time |
|----------|----------------|-------------|----------------|
| **Android** | 2,500ms | 15,000ms | 17,500ms |
| **iOS** | 1,500ms | 5,000ms | 6,500ms |

---

### Test: `render network list efficiently with multiple accounts and all popular networks (profile syncing disabled)`
**Configuration**: 11 accounts, popular networks, profile syncing disabled

| Platform | Navigation Time | Render Time | Total Max Time |
|----------|----------------|-------------|----------------|
| **Android** | 2,500ms | 15,000ms | 17,500ms |
| **iOS** | 1,500ms | 5,000ms | 6,500ms |

---

### Test: `handle network list performance with heavy token load on all popular networks w/profile syncing`
**Configuration**: 16 accounts, popular networks, 50 tokens, profile syncing enabled

| Platform | Navigation Time | Render Time | Total Max Time |
|----------|----------------|-------------|----------------|
| **Both** | 3,000ms | 8,000ms | 11,000ms |

---

### Test: `handle network list performance with heavy token load on all popular networks (without profile syncing)`
**Configuration**: 4 accounts, popular networks, 50 tokens, profile syncing disabled

| Platform | Navigation Time | Render Time | Total Max Time |
|----------|----------------|-------------|----------------|
| **Both** | 3,000ms | 8,000ms | 11,000ms |

---

### Test: `benchmark network list with minimal load w/profile syncing`
**Configuration**: 16 accounts, popular networks, 2 tokens, profile syncing enabled

| Platform | Total Max Time | Notes |
|----------|----------------|--------|
| **Both** | 3,000ms | Baseline measurement |

---

### Test: `benchmark network list with minimal load (without profile syncing)`
**Configuration**: 2 accounts, popular networks, 2 tokens, profile syncing disabled

| Platform | Total Max Time | Notes |
|----------|----------------|--------|
| **Both** | 3,000ms | Baseline measurement |

---

## 📊 Test Summary

### Account List Tests (6 tests)
- ✅ **Standard Load + Profile Sync**: 16 accounts, popular networks
- ✅ **Heavy Load + Profile Sync**: 16 accounts, 50 tokens, popular networks  
- ✅ **Standard Load - No Profile Sync**: 11 accounts, popular networks
- ✅ **Heavy Load - No Profile Sync**: 11 accounts, 50 tokens, popular networks
- ✅ **Baseline Test**: 2 accounts, 2 tokens, default network

### Network List Tests (6 tests)
- ✅ **Standard Load + Profile Sync**: 16 accounts, popular networks
- ✅ **Standard Load - No Profile Sync**: 11 accounts, popular networks
- ✅ **Heavy Load + Profile Sync**: 16 accounts, 50 tokens, popular networks
- ✅ **Heavy Load - No Profile Sync**: 4 accounts, 50 tokens, popular networks
- ✅ **Baseline + Profile Sync**: 16 accounts, 2 tokens, popular networks
- ✅ **Baseline - No Profile Sync**: 2 accounts, 2 tokens, popular networks

---

## 🚨 Quality Gate Rules

### Failure Criteria
Tests fail immediately when total time exceeds the maximum acceptable time for any scenario.

### Performance Patterns
- **Profile Syncing**: Generally increases render times, especially on Android (to be confirmed)
- **Heavy Token Load**: Increases both navigation and render times (to be confirmed)
- **Platform Differences**: iOS consistently performs better than Android (to be confirmed)
- **Baseline Tests**: Should complete within 3 seconds regardless of configuration (to be confirmed)

---
