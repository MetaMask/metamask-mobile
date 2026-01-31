# feat: update Browser Tabs View with new top navigation and grid layout

## **Description**

This PR updates the Browser Tabs View to match the new design specifications.

**Key changes:**

1. **Replaced bottom action bar with top navigation bar** - Removed the old bottom bar (Close All / + / Done buttons) and added a new top navigation bar with:
   - Back button (ArrowLeft icon) on the left
   - "Opened tabs" title centered
   - Add button (Add icon) on the right

2. **Updated back button behavior** - The back button now navigates to the Explore page (TrendingView) when:
   - No tabs exist, OR
   - The active tab was closed

3. **Updated "+" button behavior** - Creates a new empty tab (DiscoveryTab) and immediately dismisses the tabs view

4. **Converted tabs from list to 2-column grid layout** - Tabs are now displayed in a more compact grid format with smaller thumbnails

5. **Removed Close All functionality** - This feature has been removed from the UI

### Files Changed

| File                                                         | Changes                                            |
| ------------------------------------------------------------ | -------------------------------------------------- |
| `app/components/UI/Tabs/index.js`                            | Removed bottom bar, added top nav bar, grid layout |
| `app/components/UI/Tabs/TabThumbnail/TabThumbnail.styles.ts` | Updated dimensions for grid                        |
| `app/components/Views/Browser/index.js`                      | Enhanced closeTabsView navigation logic            |
| `app/components/Views/BrowserTab/BrowserView.testIds.ts`     | Added/deprecated test IDs                          |
| `app/components/UI/Tabs/index.test.tsx`                      | Updated tests and snapshots                        |
| `locales/languages/en.json`                                  | Added new localization strings                     |

## **Changelog**

CHANGELOG entry: Updated the Browser Tabs View with a new top navigation bar, 2-column grid layout, and improved navigation behavior

## **Related issues**

Fixes:

## **Manual testing steps**

```gherkin
Feature: Browser Tabs View

  Scenario: User opens tabs view and sees new UI
    Given user has multiple browser tabs open
    When user taps the tabs button to open tabs view
    Then user sees a top bar with back button, "Opened tabs" title, and add button
    And tabs are displayed in a 2-column grid layout

  Scenario: User creates a new tab from tabs view
    Given user is in the tabs view
    When user taps the add (+) button
    Then a new empty tab is created
    And the tabs view is dismissed
    And user is switched to the new tab

  Scenario: User navigates back with active tab
    Given user has browser tabs open
    And user is in the tabs view
    When user taps the back button
    Then the tabs view is dismissed
    And user returns to the active tab

  Scenario: User navigates back with no tabs
    Given user has no browser tabs open
    And user is in the tabs view
    When user taps the back button
    Then user is navigated to the Explore page

  Scenario: User navigates back after closing active tab
    Given user has closed the active tab in tabs view
    When user taps the back button
    Then user is navigated to the Explore page
```

## **Screenshots/Recordings**

### **Before**

<!-- Add screenshot of old tabs view with bottom bar -->

### **After**

<!-- Add screenshot of new tabs view with top bar and grid layout -->

## **Pre-merge author checklist**

- [x] I've followed [MetaMask Contributor Docs](https://github.com/MetaMask/contributor-docs) and [MetaMask Mobile Coding Standards](https://github.com/MetaMask/metamask-mobile/blob/main/.github/guidelines/CODING_GUIDELINES.md).
- [x] I've completed the PR template to the best of my ability
- [x] I've included tests if applicable
- [x] I've documented my code using [JSDoc](https://jsdoc.app/) format if applicable
- [ ] I've applied the right labels on the PR (see [labeling guidelines](https://github.com/MetaMask/metamask-mobile/blob/main/.github/guidelines/LABELING_GUIDELINES.md)). Not required for external contributors.

## **Pre-merge reviewer checklist**

- [ ] I've manually tested the PR (e.g. pull and build branch, run the app, test code being changed).
- [ ] I confirm that this PR addresses all acceptance criteria described in the ticket it closes and includes the necessary testing evidence such as recordings and or screenshots.
