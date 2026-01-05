# Create Deeplink Handler

Generate a new deeplink handler with all required boilerplate code, tests, and integration instructions.

## Required Information

Before generating, I need the following details:

1. **Action Name** (kebab-case): The URL path segment (e.g., `my-feature` for `https://link.metamask.io/my-feature`)
2. **URL Parameters**: List of query parameters to support (e.g., `id`, `type`, `source`)
3. **Navigation Route**: The destination route constant (e.g., `Routes.MY_FEATURE.HOME`)
4. **Whitelisting**: Should this action bypass the security interstitial? (default: no)

---

## Generation Tasks

Using the guidelines from `.cursor/rules/deeplink-handler-guidelines.mdc`, generate the following:

### 1. Handler File

Create `app/core/DeeplinkManager/handlers/legacy/handle{PascalCaseName}Url.ts` with:

- Proper TypeScript interfaces for params
- URL parameter parsing function
- Main handler function with try/catch and fallback
- DevLogger usage for debugging
- TSDoc documentation with supported URL formats

### 2. Test File

Create `app/core/DeeplinkManager/handlers/legacy/__tests__/handle{PascalCaseName}Url.test.ts` with:

- Jest mocks for NavigationService and DevLogger
- Test cases for:
  - Navigation with no parameters
  - Navigation with each individual parameter
  - Navigation with all parameters combined
  - Fallback to WALLET.HOME on error

### 3. Integration Instructions

After generating the files, provide exact code snippets for the manual integration steps:

#### Step A: Add to ACTIONS enum

Show the exact line to add to `app/constants/deeplinks.ts`

#### Step B: Add to PREFIXES

Show the exact line to add to the PREFIXES object

#### Step C: Import handler

Show the import statement for `handleUniversalLink.ts`

#### Step D: Add to SUPPORTED_ACTIONS enum

Show the exact line to add

#### Step E: Add switch case (CRITICAL)

Show the complete switch case block to add

#### Step F: (Optional) Add to whitelist

If whitelisting requested, show the line to add to WHITELISTED_ACTIONS

### 4. Test Commands

Provide ready-to-run commands:

- Unit test command
- iOS Simulator deeplink test
- Android Emulator deeplink test

### 5. Documentation Updates

Remind to update:

- `docs/readme/deeplinking.md` (add to Supported Actions table)
- `docs/deeplink-test-urls.md` (add test URLs)

---

## Example Usage

**User prompt**: "Create a deeplink handler for `stake` with parameters `validator` and `amount`, navigating to `Routes.STAKING.STAKE_INPUT`"

**Expected output**:

1. Generated `handleStakeUrl.ts` with validator and amount params
2. Generated `handleStakeUrl.test.ts` with full test coverage
3. Copy-paste integration snippets for all manual steps
4. Test commands ready to run

---

## File References

@.cursor/rules/deeplink-handler-guidelines.mdc
@app/constants/deeplinks.ts
@app/core/DeeplinkManager/handlers/legacy/handleUniversalLink.ts
@app/core/DeeplinkManager/handlers/legacy/handlePerpsUrl.ts
@app/core/DeeplinkManager/handlers/legacy/handleRewardsUrl.ts
@app/core/DeeplinkManager/handlers/legacy/handlePredictUrl.ts
