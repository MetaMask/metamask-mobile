# MetaMask Mobile Bundle Size Investigation

## Current State Analysis

### Key Findings

1. **Design System Packages Not Present**: 
   - `@metamask/design-system-react-native` is NOT in dependencies
   - `@metamask/design-system-twrnc-preset` is NOT in dependencies
   - No references to these packages found in the codebase

2. **Node.js Version Compatibility Issue** ✅ **RESOLVED**:
   - Project requires: Node.js ^20.18.0
   - Current version: v20.18.0 (Fixed using nvm)

3. **PPOM Build Issue** ✅ **RESOLVED**:
   - Missing `ppom.html.js` file (4.5MB) was causing bundle failure
   - Fixed by building PPOM module: `cd ppom && yarn install && yarn build`

4. **Missing Terms of Use Content** ✅ **RESOLVED**:
   - Missing `app/util/termsOfUse/termsOfUseContent.ts` file
   - Created placeholder content file

5. **Multiformats Package Issue** ✅ **RESOLVED**:
   - Package used ES modules with `exports` field but Metro expected `main` field
   - Fixed by adding `"main": "dist/src/index.js"` to package.json

6. **@ledgerhq Package Resolution Issues** ⚠️ **ONGOING**:
   - Metro bundler has systematic issues resolving @ledgerhq packages with deep paths
   - Multiple packages affected: `@ledgerhq/domain-service`, `@ledgerhq/evm-tools`
   - Files exist but Metro cannot resolve the import paths correctly

## Progress Status

### Fixed Issues:
- ✅ Node.js version compatibility
- ✅ PPOM build and dependency resolution
- ✅ Missing terms of use content
- ✅ Multiformats package main field

### Current Issue:
- ⚠️ **@ledgerhq Package Resolution**: Metro bundler cannot resolve deep import paths like:
  - `@ledgerhq/domain-service/signers/index`
  - `@ledgerhq/evm-tools/selectors/index`
  
### Bundle Size Analysis

**Current Status**: Cannot complete bundle generation due to @ledgerhq import issues

**Known Large Components**:
- PPOM module: ~4.5MB (ppom.html.js)
- This is likely a major contributor to bundle size

**Next Steps for @ledgerhq Issue**:
1. Analyze package.json exports configuration for all @ledgerhq packages
2. Consider Metro resolver configuration changes
3. Investigate if this is a known Metro + @ledgerhq compatibility issue
4. Potentially patch multiple packages or configure Metro to handle these imports

## Original Context Verification

Based on our investigation, the original context mentioning design system packages causing bundle size issues appears to be from a different branch or future state. The current codebase:

- Does NOT contain the mentioned design system packages
- Does NOT have the specific files mentioned (design-system.stories.tsx)
- HAS dependency resolution issues preventing bundle generation
- REQUIRES fixes to multiple dependency packages before bundle analysis can proceed

## Bundle Generation Command Status

```bash
# These commands work now:
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
cd ppom && yarn install && yarn build && cd ..

# This command still fails due to @ledgerhq issues:
yarn gen-bundle:ios
```

## Conclusion

The investigation revealed that the bundle size issue described in the context cannot be reproduced in the current codebase state. The main blockers are dependency resolution issues with @ledgerhq packages that prevent bundle generation altogether.

**Action Required**: Fix @ledgerhq package resolution issues before proceeding with bundle size analysis.