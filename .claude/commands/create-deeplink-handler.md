# Create Deeplink Handler

Generate a new deeplink handler for MetaMask Mobile with all required boilerplate code, tests, and integration steps.

## Interactive Information Gathering

**Before generating any code, prompt the user for the following information one at a time:**

1. **Action Name** (kebab-case):
   - Prompt: "What is the action name in kebab-case? (e.g., 'my-feature' for URL path `/my-feature`)"
   - This becomes the URL path segment: `https://link.metamask.io/{action-name}`

2. **URL Parameters**:
   - Prompt: "What URL query parameters should this handler support? (e.g., 'id, type, source' or 'none' if no parameters)"
   - Parse the response into an array of parameter names

3. **Navigation Route**:
   - Prompt: "What is the destination route constant? (e.g., Routes.STAKING.STAKE_INPUT)"
   - Validate the route format (should start with `Routes.`)

4. **Whitelisting**:
   - Prompt: "Should this action bypass the security interstitial? (yes/no, default: no)"
   - Only whitelist if the user explicitly says yes

5. **Integration Mode**:
   - Prompt: "How would you like to proceed? (snippets/full, default: full)"
     - `snippets` — Generate handler and test files, then show integration code snippets for manual review
     - `full` — Generate all files AND automatically integrate the handler into the app (ready to use)
   - Default to `full` if no response or unclear

**After collecting all information, proceed with generation based on the chosen integration mode.**

## Reference Documentation

Follow these guidelines strictly:

- `.cursor/rules/deeplink-handler-guidelines.mdc` - Complete handler creation guide
- `.claude/commands/create-deeplink-handler.md` - Generation tasks and patterns

## Generation Tasks

### 1. Handler File

Create `app/core/DeeplinkManager/handlers/legacy/handle{PascalCaseName}Url.ts`:

**Pattern Requirements:**

- Import: `NavigationService`, `Routes`, `DevLogger`
- Interface: `Handle{PascalCaseName}UrlParams` with `actionPath: string`
- Interface: `{PascalCaseName}NavigationParams` with all URL parameters as optional properties
- Function: `parseNavigationParams(actionPath: string)` using URLSearchParams pattern:
  ```typescript
  const urlParams = new URLSearchParams(
    actionPath.includes('?') ? actionPath.split('?')[1] : '',
  );
  ```
- Main handler: `handle{PascalCaseName}Url` with:
  - DevLogger.log at start with action path
  - try/catch wrapper
  - parseNavigationParams call
  - DevLogger.log for parsed parameters
  - NavigationService.navigation.navigate with route and params
  - catch block: DevLogger.log error + fallback to `Routes.WALLET.HOME`
- TSDoc: Document all supported URL formats (base URL, with each param, with all params)

**Reference examples:**

- `handlePerpsUrl.ts`
- `handleRewardsUrl.ts`
- `handlePredictUrl.ts`

### 2. Test File

Create `app/core/DeeplinkManager/handlers/legacy/__tests__/handle{PascalCaseName}Url.test.ts`:

**Test Structure:**

- Mock `NavigationService` (navigation.navigate)
- Mock `DevLogger` (log)
- beforeEach: clearAllMocks()

**Test Cases:**

1. Navigates with no parameters

   ```typescript
   await handle{PascalCaseName}Url({ actionPath: '' });
   expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
     Routes.{ROUTE},
     expect.objectContaining({}),
   );
   ```

2. Navigates with each individual parameter (one test per parameter)

   ```typescript
   await handle{PascalCaseName}Url({ actionPath: '?param1=value1' });
   expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
     Routes.{ROUTE},
     expect.objectContaining({ param1: 'value1' }),
   );
   ```

3. Navigates with all parameters combined

   ```typescript
   await handle{PascalCaseName}Url({ actionPath: '?param1=value1&param2=value2' });
   expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
     Routes.{ROUTE},
     expect.objectContaining({ param1: 'value1', param2: 'value2' }),
   );
   ```

4. Falls back to WALLET.HOME on error
   ```typescript
   (NavigationService.navigation.navigate as jest.Mock)
     .mockImplementationOnce(() => { throw new Error('Navigation failed'); });
   await handle{PascalCaseName}Url({ actionPath: '?param=value' });
   expect(NavigationService.navigation.navigate).toHaveBeenLastCalledWith(
     Routes.WALLET.HOME,
   );
   ```

### 3. Integration Steps

**Behavior depends on user's integration mode choice:**

- **If `full` mode (default):** After generating handler and test files, you MUST actually perform all integration steps below by modifying the files directly. Integrate the handler into the app so it's ready to use.

- **If `snippets` mode:** Generate the handler and test files, then provide the code snippets below for the user to manually integrate. Do NOT modify the integration files automatically.

Perform (or show) all of the following integration steps:

#### Step A: Add to ACTIONS enum

**File:** `app/constants/deeplinks.ts`

```typescript
export enum ACTIONS {
  // ... existing actions
  {UPPER_SNAKE_CASE} = '{kebab-case}',
}
```

#### Step B: Add to PREFIXES

**File:** `app/constants/deeplinks.ts`

```typescript
export const PREFIXES = {
  // ... existing prefixes
  [ACTIONS.{UPPER_SNAKE_CASE}]: '',
};
```

#### Step C: Import handler

**File:** `app/core/DeeplinkManager/handlers/legacy/handleUniversalLink.ts`

```typescript
import { handle{PascalCaseName}Url } from './handle{PascalCaseName}Url';
```

#### Step D: Add to SUPPORTED_ACTIONS enum

**File:** `app/core/DeeplinkManager/handlers/legacy/handleUniversalLink.ts`

```typescript
enum SUPPORTED_ACTIONS {
  // ... existing actions
  {UPPER_SNAKE_CASE} = ACTIONS.{UPPER_SNAKE_CASE},
}
```

#### Step E: Add switch case (CRITICAL - Most commonly forgotten!)

**File:** `app/core/DeeplinkManager/handlers/legacy/handleUniversalLink.ts`
**Location:** Inside the switch statement (around line 254+)

```typescript
switch (action) {
  // ... existing cases
  case SUPPORTED_ACTIONS.{UPPER_SNAKE_CASE}: {
    handle{PascalCaseName}Url({
      actionPath: actionBasedRampPath,
    });
    break;
  }
}
```

> ⚠️ **CRITICAL**: Emphasize this step! Missing the switch case means the action will pass validation but silently do nothing.

#### Step F: (Optional) Add to whitelist

**Only if user requested whitelisting:**
**File:** `app/core/DeeplinkManager/handlers/legacy/handleUniversalLink.ts`

```typescript
const WHITELISTED_ACTIONS: SUPPORTED_ACTIONS[] = [
  // ... existing actions
  SUPPORTED_ACTIONS.{UPPER_SNAKE_CASE},
];
```

**After completing all integration steps (full mode only), verify the handler is fully connected by:**

- Checking that all files were actually modified (not just showing snippets)
- Confirming the handler can be imported and used
- Verifying no linting errors were introduced

**For snippets mode:** Remind the user which files need to be modified and emphasize that the switch case step is critical.

### 4. Test Commands

Provide ready-to-run commands:

**Unit Test:**

```bash
yarn jest app/core/DeeplinkManager/handlers/legacy/__tests__/handle{PascalCaseName}Url.test.ts --no-coverage
```

**iOS Simulator:**

```bash
xcrun simctl openurl booted "https://link-test.metamask.io/{action-name}?{param1}=value1&{param2}=value2"
```

**Android Emulator:**

```bash
adb shell am start -W -a android.intent.action.VIEW \
  -d "https://link-test.metamask.io/{action-name}?{param1}=value1&{param2}=value2" \
  io.metamask.debug
```

### 5. Documentation Reminders

Remind user to manually update:

- `docs/readme/deeplinking.md` - Add to Supported Actions table
- `docs/deeplink-test-urls.md` - Add test URLs

## Naming Conventions

- **kebab-case** → Action name (URL path): `my-feature`
- **PascalCase** → Handler function/interface: `handleMyFeatureUrl`, `MyFeatureNavigationParams`
- **UPPER_SNAKE_CASE** → Enum constant: `MY_FEATURE`

## Common Pitfalls to Avoid

1. ❌ **Missing switch case** - Action defined but no handler called
2. ❌ **Wrong path parsing** - Must split on `?` before URLSearchParams
3. ❌ **No fallback navigation** - Always wrap in try/catch with Routes.WALLET.HOME fallback
4. ❌ **Using console.log** - Must use DevLogger.log
5. ❌ **Missing TSDoc** - Document all supported URL formats

## Checklist Before Completion

- [ ] All user information collected interactively (including integration mode)
- [ ] Handler file created with proper structure
- [ ] Test file created with all test cases
- [ ] **Full mode:** All integration steps (A-F) actually performed in code files
- [ ] **Full mode:** Handler verified to be hooked up and ready to use
- [ ] **Snippets mode:** Integration snippets provided for all steps
- [ ] **Snippets mode:** User reminded which files to modify
- [ ] Test commands provided
- [ ] Documentation reminders included
- [ ] Switch case step emphasized as critical

## File References

@.cursor/rules/deeplink-handler-guidelines.mdc
@.claude/commands/create-deeplink-handler.md
@app/constants/deeplinks.ts
@app/core/DeeplinkManager/handlers/legacy/handleUniversalLink.ts
@app/core/DeeplinkManager/handlers/legacy/handlePerpsUrl.ts
@app/core/DeeplinkManager/handlers/legacy/handleRewardsUrl.ts
@app/core/DeeplinkManager/handlers/legacy/handlePredictUrl.ts
