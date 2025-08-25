## **Description**

Fixes a regression where Perps WebSocket connections stopped disconnecting on tab switches after migrating from route-based to provider-based connection management. Also adds intelligent app state handling and fixes duplicate API calls to optimize battery and network usage.

### The Regression

**What broke:** After migrating to provider-based connection management, WebSocket connections no longer disconnect when users switch tabs because `react-native-scrollable-tab-view` keeps all tabs mounted (using `StaticContainer` for performance).

**Impact:**

- **Battery drain** - Active WebSocket connection when not viewing Perps
- **Network usage** - ~500KB/min continuous data consumption
- **Resource waste** - Unnecessary pre-warm subscriptions maintained
- **Duplicate API calls** - Multiple components fetching same market data simultaneously

### Solution

1. **Visibility Tracking** - Callback pattern allows parent (Wallet) to notify PerpsTabView of tab visibility changes
2. **New Lifecycle Hook** - `usePerpsConnectionLifecycle` manages connections based on:
   - Tab visibility (immediate disconnect on tab switch)
   - App state (20-second delay when backgrounded for quick returns)
3. **Platform-Specific Timers** - Uses `react-native-background-timer` to ensure timers work when app is suspended
4. **API Deduplication** - Promise-based caching prevents duplicate market data fetches when multiple components mount

### Implementation

- **Clean separation:** Connection lifecycle logic extracted to dedicated hook
- **Comprehensive tests:** 100% test coverage for critical functionality
- **Follows existing patterns:** Similar to SDKConnect background handling
- **Minimal diff:** Promise-based deduplication with module-level cache

## **Changelog**

CHANGELOG entry: Fixed Perps WebSocket connection not disconnecting when switching tabs or backgrounding app, and eliminated duplicate API calls on initial load

## **Related issues**

Fixes: Perps WebSocket connection lifecycle management issue

## **Manual testing steps**

```gherkin
Feature: Perps WebSocket Connection Lifecycle

  Scenario: User switches away from Perps tab
    Given user is on the Perps tab with active WebSocket connection

    When user taps on Tokens tab
    Then WebSocket connection should disconnect within 1 second
    And DevLogger should show "PerpsConnectionProvider: Visibility changed" with isVisible: false

  Scenario: User backgrounds the app while on Perps tab
    Given user is viewing the Perps tab

    When user backgrounds the app (Home button/app switcher)
    Then WebSocket connection should schedule disconnection in 20 seconds (now works with BackgroundTimer)
    And DevLogger should show "usePerpsConnectionLifecycle: Scheduling disconnection"

  Scenario: User quickly returns to app (within 20s)
    Given user backgrounded the app with Perps tab active

    When user returns to app within 20 seconds
    Then WebSocket connection should remain connected
    And DevLogger should show "App foregrounded, cancelling scheduled disconnection"

  Scenario: User returns to Perps tab
    Given user is on Tokens tab with no WebSocket connection

    When user taps on Perps tab
    Then WebSocket connection should establish within 2 seconds
    And Perps data should load from cache immediately
    And DevLogger should show "Visibility changed" with isVisible: true

  Scenario: User returns to app with Perps tab active
    Given app is backgrounded with Perps tab previously active

    When user returns to the app
    Then WebSocket should reconnect automatically
    And pre-warm subscriptions should be re-established

  Scenario: Rapid tab switching
    Given user is on Perps tab

    When user rapidly switches between Tokens and Perps tabs
    Then connection should handle transitions gracefully
    And no connection errors should occur
```

## **Screenshots/Recordings**

### **Before**

- WebSocket connection remains active when switching tabs
- Connection persists when app is backgrounded
- DevLogger shows no disconnection events
- Network inspector shows continuous WebSocket traffic

### **After**

- WebSocket disconnects when leaving Perps tab
- Connection properly closes on app background
- DevLogger shows clear connection lifecycle events:
  ```
  PerpsConnectionProvider: Visibility changed {isVisible: false}
  PerpsConnectionManager: Disconnection requested (refCount: 0)
  PerpsConnectionManager: Disconnecting (no more references)
  ```
- Network inspector shows WebSocket closed when not in use

## **Pre-merge author checklist**

- [x] I've followed [MetaMask Contributor Docs](https://github.com/MetaMask/contributor-docs) and [MetaMask Mobile Coding Standards](https://github.com/MetaMask/metamask-mobile/blob/main/.github/guidelines/CODING_GUIDELINES.md).
- [x] I've completed the PR template to the best of my ability
- [x] I've included tests if applicable (comprehensive test coverage)
- [x] I've documented my code using [JSDoc](https://jsdoc.app/) format if applicable
- [ ] I've applied the right labels on the PR (see [labeling guidelines](https://github.com/MetaMask/metamask-mobile/blob/main/.github/guidelines/LABELING_GUIDELINES.md)). Not required for external contributors.

## **Pre-merge reviewer checklist**

- [ ] I've manually tested the PR (e.g. pull and build branch, run the app, test code being changed).
- [ ] I confirm that this PR addresses all acceptance criteria described in the ticket it closes and includes the necessary testing evidence such as recordings and or screenshots.
