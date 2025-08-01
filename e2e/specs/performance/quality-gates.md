# 🎯 Performance Quality Gates

This document outlines the performance thresholds (quality gates) for MetaMask Mobile's critical user flows. These thresholds ensure optimal user experience across different platforms and scenarios.

## 📱 Platform Overview

- **Android**: Generally has higher thresholds due to platform constraints
- **iOS**: Lower thresholds leveraging platform optimizations
- **Quality Gates**: Hard limits that cause test failures if exceeded

## 📊 Test Reporting

Performance tests automatically generate detailed reports using the `PerformanceTestReporter` utility:

- **JSON Reports**: Structured performance data for analysis
- **Test Results**: Include timing metrics, thresholds, and pass/fail status
- **User Profile Testing**: Tests run across different user states (CORE_USER, POWER_USER)

---

## 🏠 Account List Performance Tests

### Test: `render account list efficiently with multiple accounts and networks`

**Configuration**: Multiple accounts, popular networks, profile syncing enabled

| Platform    | Total Max Time | Notes               |
| ----------- | -------------- | ------------------- |
| **Android** | 5900ms         | 5.9 seconds maximum |
| **iOS**     | 4000ms         | 4 seconds maximum   |

---

### Test: `handle account list performance with heavy token load`

**Configuration**: Multiple accounts, popular networks, 10 tokens for stress testing

| Platform    | Total Max Time | Notes               |
| ----------- | -------------- | ------------------- |
| **Android** | 4200ms         | 4.2 seconds maximum |
| **iOS**     | 4200ms         | 4.2 seconds maximum |

---

### Test: `benchmark account list with minimal load`

**Configuration**: Minimal accounts, default network, 2 tokens (baseline measurement)

| Platform    | Total Max Time | Notes               |
| ----------- | -------------- | ------------------- |
| **Android** | 3800ms         | 3.8 seconds maximum |
| **iOS**     | 3800ms         | 3.8 seconds maximum |

---

### Test: `benchmark switching accounts from the account list`

**Configuration**: Account switching/dismissal performance

| Platform    | Dismissal Max Time | Notes             |
| ----------- | ------------------ | ----------------- |
| **Android** | 5,000ms            | 5 seconds maximum |
| **iOS**     | 4,000ms            | 4 seconds maximum |

---

## 🌐 Network List Performance Tests

### Test: `render network list efficiently with multiple accounts and all popular networks`

**Configuration**: Multiple accounts, all popular networks

| Platform    | Total Max Time | Notes                |
| ----------- | -------------- | -------------------- |
| **Android** | 17,500ms       | 17.5 seconds maximum |
| **iOS**     | 6,500ms        | 6.5 seconds maximum  |

---

### Test: `handle network list performance with heavy token load on all popular networks`

**Configuration**: Multiple accounts, popular networks, 10 tokens for stress testing

| Platform    | Total Max Time | Notes                |
| ----------- | -------------- | -------------------- |
| **Android** | 17,500ms       | 17.5 seconds maximum |
| **iOS**     | 6,500ms        | 6.5 seconds maximum  |

---

### Test: `benchmark network list with minimal load`

**Configuration**: Minimal tokens, popular networks (baseline measurement)

| Platform    | Render Max Time | Notes               |
| ----------- | --------------- | ------------------- |
| **Android** | 2,500ms         | 2.5 seconds maximum |
| **iOS**     | 1,500ms         | 1.5 seconds maximum |

---

### Test: `benchmark switching networks from the network list`

**Configuration**: Network switching/dismissal performance

| Platform    | Dismissal Max Time | Notes               |
| ----------- | ------------------ | ------------------- |
| **Android** | 2,500ms            | 2.5 seconds maximum |
| **iOS**     | 1,500ms            | 1.5 seconds maximum |

---

## 📊 Test Summary

### Account List Tests (4 tests)

- ✅ **Standard Load**: Multiple accounts, popular networks
- ✅ **Heavy Load**: Multiple accounts, 10 tokens, popular networks
- ✅ **Baseline Test**: Minimal accounts, 2 tokens, default network
- ✅ **Dismissal Test**: Account switching performance

### Network List Tests (4 tests)

- ✅ **Standard Load**: Multiple accounts, popular networks
- ✅ **Heavy Load**: Multiple accounts, 10 tokens, popular networks
- ✅ **Baseline Test**: Minimal tokens, popular networks
- ✅ **Dismissal Test**: Network switching performance

**Total**: 8 performance tests across critical user flows

---

## 🚨 Quality Gate Rules

### Failure Criteria

Tests fail immediately when total time exceeds the maximum acceptable time for any scenario.

### Performance Patterns

- **Heavy Token Load**: Increases render times but maintains same thresholds as standard load
- **Platform Differences**: iOS consistently performs better than Android
- **Baseline Tests**: Should complete quickly but have generous thresholds for stability
- **Dismissal Tests**: Focus on UI responsiveness during state transitions

### User Profile Testing

Tests run across different user states with varying account complexity:

#### User Profile Definitions

- **CASUAL_USER**: 2 EVM accounts from 1 SRP _(currently not used in tests)_
- **CORE_USER**: 5 EVM accounts and 5 Solana accounts from 1 SRP
- **POWER_USER**: 15 EVM accounts from 2 SRPs + 5 Solana accounts

#### Current Test Coverage

- **CORE_USER**: Standard user configuration for baseline performance
- **POWER_USER**: Enhanced user configuration with maximum account complexity

---

## 📈 Reporting Features

### Automated Reports

- **JSON Output**: Structured performance data for CI/CD integration
- **Test Metrics**: Total time measurements and performance thresholds
- **Threshold Tracking**: Pass/fail status with actual vs. expected performance
- **User Profile Results**: Separate results for different user configurations

### Report Usage

Performance reports can be used for:

- Continuous integration quality gates
- Performance regression detection
- Platform-specific optimization insights
- User experience benchmarking

---
