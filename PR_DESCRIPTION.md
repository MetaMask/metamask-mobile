# Pull Request: Fix padding between Mainnet section and search bar in NetworksSettings

## **Description**

Fixed the inconsistent padding issue in the Networks Settings screen where the spacing between the search bar and the "Mainnet" section was thinner than the spacing between the "Mainnet" section and other subsequent sections like "Custom networks" and "Test networks".

**What is the reason for the change?**
The spacing between the search input and the first "Mainnet" section was visually inconsistent with the spacing between other sections, creating an unbalanced layout as identified in the Slack thread feedback.

**What is the improvement/solution?**
- Added a new `firstSectionLabel` style with increased `paddingTop` (24px) to ensure consistent spacing
- Added the missing `networksWrapper` style with `marginTop` (12px) that was being referenced but not defined
- Applied the `firstSectionLabel` style specifically to the first "Mainnet" section to match the visual spacing of subsequent sections

## **Changelog**

CHANGELOG entry: Fixed inconsistent padding between search bar and Mainnet section in Networks Settings

## **Related issues**

Fixes: Padding inconsistency mentioned in Slack thread between Mainnet section and search bar

## **Manual testing steps**

1. Go to Settings > Networks in the MetaMask Mobile app
2. Observe the spacing between the search bar at the top and the "Mainnet" section
3. Compare it with the spacing between "Mainnet" and "Custom networks" sections
4. Verify that the spacing is now consistent and visually balanced

## **Screenshots/Recordings**

### **Before**
The original image showed inconsistent padding where the space between the search bar and "Mainnet" section was noticeably thinner than between other sections.

### **After**
With the fix, the spacing between the search bar and "Mainnet" section now matches the spacing between subsequent sections, creating a more balanced and consistent visual layout.

## **Pre-merge author checklist**

- [x] I've followed [MetaMask Contributor Docs](https://github.com/MetaMask/contributor-docs) and [MetaMask Mobile Coding Standards](https://github.com/MetaMask/metamask-mobile/blob/main/.github/guidelines/CODING_GUIDELINES.md).
- [x] I've completed the PR template to the best of my ability
- [x] I've included tests if applicable (style-only changes, no new logic)
- [x] I've documented my code using [JSDoc](https://jsdoc.app/) format if applicable (CSS-only changes)
- [ ] I've applied the right labels on the PR (see [labeling guidelines](https://github.com/MetaMask/metamask-mobile/blob/main/.github/guidelines/LABELING_GUIDELINES.md)). Not required for external contributors.

## **Pre-merge reviewer checklist**

- [ ] I've manually tested the PR (e.g. pull and build branch, run the app, test code being changed).
- [ ] I confirm that this PR addresses all acceptance criteria described in the ticket it closes and includes the necessary testing evidence such as recordings and or screenshots.

---

## Technical Details

**Files Changed:**
- `app/components/Views/Settings/NetworksSettings/index.js`

**Changes Made:**
1. Added `firstSectionLabel` style with `paddingTop: 24px` (compared to regular `paddingVertical: 12px`)
2. Added `networksWrapper` style with `marginTop: 12px` that was missing but referenced
3. Applied `firstSectionLabel` style to the first section: `<Text style={styles.firstSectionLabel}>`

The fix ensures visual consistency in the Networks Settings UI by standardizing the spacing between all sections.

**Branch:** `cursor/fix-mainnet-section-padding-79d9`

**Create PR URL:** https://github.com/MetaMask/metamask-mobile/pull/new/cursor/fix-mainnet-section-padding-79d9