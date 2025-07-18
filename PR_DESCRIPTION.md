## **Description**

This PR fixes two UI issues in the MetaMask mobile app related to token approval displays and text capitalization:

1. **Scientific Notation Issue**: Fixed the display of large token approval amounts that were showing in scientific notation (e.g., "1.157920892373162e+59") by improving the number formatting logic in the `renderFromTokenMinimalUnit` function.

2. **Text Capitalization Issue**: Fixed the capitalization of block explorer links from "VIEW ON Bscscan" to "View on Bscscan" to maintain consistency with MetaMask UI standards.

## **Changelog**

CHANGELOG entry: Fixed token approval amounts displaying in scientific notation and corrected block explorer link capitalization

## **Related issues**

Fixes: #17378

## **Manual testing steps**

1. Go to the Swaps feature in MetaMask mobile
2. Initiate a token swap that requires approval for a large token amount
3. Verify that the approval amount is displayed in standard decimal format (not scientific notation)
4. Check that the "View on [Block Explorer]" link uses proper capitalization
5. Navigate to transaction details and verify block explorer links show "View on" instead of "VIEW ON"

## **Screenshots/Recordings**

### **Before**

The approval amount was displayed as "1.157920892373162e+59" and block explorer links showed "VIEW ON Bscscan".

### **After**

The approval amount now displays in readable decimal format and block explorer links show "View on Bscscan".

## **Pre-merge author checklist**

- [x] I've followed [MetaMask Contributor Docs](https://github.com/MetaMask/contributor-docs) and [MetaMask Mobile Coding Standards](https://github.com/MetaMask/metamask-mobile/blob/main/.github/guidelines/CODING_GUIDELINES.md).
- [x] I've completed the PR template to the best of my ability
- [x] I've included tests if applicable
- [x] I've documented my code using [JSDoc](https://jsdoc.app/) format if applicable
- [x] I've applied the right labels on the PR (see [labeling guidelines](https://github.com/MetaMask/metamask-mobile/blob/main/.github/guidelines/LABELING_GUIDELINES.md)). Not required for external contributors.

## **Pre-merge reviewer checklist**

- [ ] I've manually tested the PR (e.g. pull and build branch, run the app, test code being changed).
- [ ] I confirm that this PR addresses all acceptance criteria described in the ticket it closes and includes the necessary testing evidence such as recordings and or screenshots.

## **Technical Details**

### Changes Made:

1. **`app/util/number/index.js`**: 
   - Modified `renderFromTokenMinimalUnit` function to use `BigNumber` instead of `parseFloat()` 
   - This prevents JavaScript's automatic conversion to scientific notation for very large numbers
   - Added proper decimal formatting with trailing zero removal

2. **`locales/languages/en.json`**:
   - Changed `"view_on": "VIEW ON"` to `"view_on": "View on"` 
   - This affects all block explorer links throughout the app to use proper capitalization

### Impact:
- Resolves user confusion when viewing large token approval amounts
- Maintains consistent UI text capitalization across the app
- No breaking changes - purely cosmetic improvements