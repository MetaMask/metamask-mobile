# TRAM-4119: Quote Errors When Banxa is Autoselected

## Investigation Summary

### Issue Description
When an auto-selected provider (e.g., Banxa) returns no quotes, the UI shows "Buying via Banxa" with Continue disabled, even though other providers (Coinbase, MoonPay) have returned valid quotes.

**Example scenario:** Buying PEPE on Ethereum from Spain for ~€70
- Banxa was auto-selected but returned no quote
- Other providers (Coinbase, MoonPay) had quotes
- UI remained stuck on Banxa with Continue disabled

### Mobile Status: **BUG CONFIRMED** ✅

Mobile **does** have the same failure mode as Extension.

#### Evidence from Code Analysis

1. **Current provider switching logic** (`@metamask/ramps-controller@29.0.0`):
   - `setSelectedProviderForAsset()` switches providers based on **asset support** (`supportedCryptoCurrencies`)
   - **NOT** based on actual quote availability
   - Location: `node_modules/@metamask/ramps-controller/dist/RampsController.js`

2. **Mobile UI behavior** (`BuildQuote.tsx`):
   - Fetches quotes for the selected provider + payment method
   - Only displays quote from the selected provider (lines 528-542)
   - Shows "no quotes" error when selected provider has no quote, even if other providers do
   - Continue button disabled when `selectedQuote === null` (line 686)

3. **Test evidence** (`BuildQuote.test.tsx`):
   ```typescript
   it('shows no-quotes error when quote provider does not match selected provider', () => {
     mockUseRampsQuotes.mockReturnValue({
       data: {
         success: [{ ...WIDGET_PROVIDER_QUOTE, provider: 'other-provider' }],
       },
     });
     // Shows error even though another provider has a quote
   });
   ```

### Root Cause

The controller's `setSelectedProviderForAsset()` only checks if a provider **lists** the asset, not if it can actually **provide quotes** for that asset+region+amount combination.

A provider can list an asset in `supportedCryptoCurrencies` but still return no quotes due to:
- Regional restrictions
- Amount limits
- Payment method incompatibility
- Temporary service issues

### The Fix (in Extension v30 - Not Yet Released)

According to the task description, Extension is using `@metamask/ramps-controller@^30.0.0` which includes quote-based provider switching:
- When auto-selected provider returns no quote, controller switches to best available quote
- Manual provider selection is respected (no auto-switch)

**Status check:**
```bash
$ cat node_modules/@metamask/ramps-controller/package.json | grep version
  "version": "29.0.0"
$ cat node_modules/@metamask/ramps-controller/CHANGELOG.md | head -10
## [29.0.0]
```

**v30.0.0 has NOT been released yet** (as of investigation date).

### Migration Assessment: v29 → v30

#### Breaking Changes Analysis

From CHANGELOG review (v29.0.0):
- **Added**: `NeoBankService.getCustomerAbilities` requirement
- **BREAKING**: `RAMPS_CONTROLLER_REQUIRED_SERVICE_ACTIONS` now includes `NeoBankService:getCustomerAbilities`
- **Changed**: Require provider-side `finalStatus` approval for KYC hydration

Most breaking changes are related to VBA (Virtual Bank Account) / neobank features, not core ramps flow.

#### Expected v30 Changes (Not Yet Documented)

Based on the task description, v30 should include:
1. Quote-based provider re-selection logic in the controller
2. Preservation of manual provider selection (no auto-switch when user explicitly chose)
3. Likely a new method or enhancement to `setSelectedProviderForAsset` or quote handling

#### Upgrade Feasibility: **BLOCKED** ⛔

**Cannot upgrade now** because:
1. v30.0.0 not published to npm
2. Breaking changes unknown (CHANGELOG stops at v29)
3. Need to wait for core team's release

**Recommendation**: 
- Track MetaMask/core releases for v30 publication
- Monitor for `ramps-controller` v30 CHANGELOG entry
- Prepare mobile codebase for seamless upgrade when available

### Mobile-Specific Considerations

#### Current Provider Fallback Logic

Mobile has **asset-based** provider fallback in `BuildQuote.tsx` (lines 268-289):
```typescript
// When no provider is selected, pick the first provider that supports the token
useEffect(() => {
  if (!selectedProvider && effectiveAssetId && providers.length > 0) {
    const supportingProvider = providers.find((p) =>
      providerSupportsAsset(p, effectiveAssetId),
    );
    if (supportingProvider) {
      setSelectedProvider(supportingProvider, { autoSelected: true });
    }
  }
}, [selectedProvider, effectiveAssetId, providers, setSelectedProvider]);
```

And **token unavailability** fallback (lines 293-350):
```typescript
// When token is unavailable for current provider, switch to another provider
useEffect(() => {
  if (isTokenUnavailable) {
    const switched = setSelectedProviderForAsset(effectiveAssetId);
    if (switched) return;
    
    // Try other supporting providers before showing modal
    const otherSupporting = providers.find(
      (p) => p.id !== selectedProvider?.id && 
             providerSupportsAsset(p, effectiveAssetId),
    );
    if (otherSupporting) {
      setSelectedProvider(otherSupporting, { autoSelected: true });
    }
  }
}, [isTokenUnavailable, effectiveAssetId, providers, ...]);
```

**Potential Conflict with v30:**
- Both mobile UI and controller v30 may attempt provider switching
- Mobile switches on asset support; v30 will switch on quote availability
- **Risk**: Double-switching or fighting over selection

**Mitigation Strategy:**
1. Keep mobile's asset-based fallback for initial provider selection (when `!selectedProvider`)
2. Remove/disable mobile's provider re-selection **after** quotes are fetched
3. Let controller v30 handle quote-based switching exclusively
4. Mobile UI should only:
   - Display the controller-selected provider's quote
   - Show clear error when manually-selected provider has no quote

### Testing Gaps

Current tests verify:
- ✅ No-quote error is shown when selected provider has no quote
- ✅ Continue button disabled when no matching quote
- ❌ **Missing**: Test for auto-switching when selected provider has no quote but others do
- ❌ **Missing**: Test for manual selection preservation (no auto-switch)
- ❌ **Missing**: Test for quote-based vs asset-based switching distinction

### Action Items

#### Immediate (This PR)
1. ✅ Document that mobile has the same bug
2. ⚠️ Add comment in `BuildQuote.tsx` noting v30 upgrade is needed
3. ⚠️ Add comment in `package.json` marking `@metamask/ramps-controller@^29.0.0` as interim
4. ✅ Add test for expected v30 behavior (skipped until upgrade)
5. ⚠️ Update provider fallback logic to not interfere with future quote-based switching

#### Post-v30 Release
1. Upgrade `@metamask/ramps-controller` to `^30.0.0`
2. Remove mobile's quote-based provider switching logic (if any)
3. Update tests to verify controller-driven quote switching
4. Regression test: manual provider selection should not auto-switch

#### Ongoing
- Monitor MetaMask/core releases for `@metamask/ramps-controller@30.0.0`
- Review v30 CHANGELOG for actual breaking changes
- Coordinate with core team on release timeline

### References

- JIRA: TRAM-4119
- Extension status: Using `@metamask/ramps-controller@^30.0.0` (fix included)
- Mobile status: Using `@metamask/ramps-controller@^29.0.0` (fix not available)
- Core PR: TBD (not yet released)
