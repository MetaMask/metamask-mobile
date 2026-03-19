## **Description**

When navigating to a market with an open position, Long/Short buttons briefly flashed before switching to Close/Modify buttons. Root cause: `usePerpsLivePositions` derived `positions` from `rawPositions` via `useEffect`, which runs after render. This created an intermediate render where `isInitialLoading=false` but `positions` was still empty. Fixed by replacing the `useEffect` with `useMemo` so positions are computed synchronously during render.

## **Changelog**

Fixed button color flash on perps market detail screen when navigating to a market with an open position

## **Related issues**

Fixes: TAT-2236

## **Manual testing steps**

```gherkin
Feature: Perps market detail action buttons
  Scenario: Market with open position shows correct buttons immediately
    Given user has an open BTC position
    When user navigates to BTC market detail
    Then Close/Modify buttons appear immediately
    And Long/Short buttons are never visible
```

## **Screenshots/Recordings**

### **Before**
See automation/27669/before.mp4

### **After**
See automation/27669/after.mp4

## **Pre-merge author checklist**

- [x] I've followed MetaMask Contributor Docs and Coding Standards
- [x] I've completed the PR template to the best of my ability
- [x] I've included tests if applicable
- [ ] I've documented my code using JSDoc format if applicable
- [x] I've applied the right labels on the PR
