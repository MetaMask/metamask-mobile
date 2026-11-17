# @metamask/ramps-controller v30 Upgrade Plan

## Status: **BLOCKED** ⛔

Waiting for `@metamask/ramps-controller@30.0.0` to be published to npm.

## Current Version
- Mobile: `^29.0.0`
- Extension: `^30.0.0` (includes TRAM-4119 fix)

## Issue
TRAM-4119: When an auto-selected provider returns no quotes, the controller should automatically switch to another provider that has quotes, while preserving manual provider selection.

## Expected v30 Behavior
1. **Auto-selected provider with no quote**: Controller automatically switches to best available quote
2. **Manual provider selection**: Preserved (no auto-switch even if no quote)
3. **Quote-based switching**: Based on actual quote availability, not just asset support

## Upgrade Checklist

### Pre-Upgrade (When v30 is Released)
- [ ] Verify v30 is published: `npm view @metamask/ramps-controller@30.0.0`
- [ ] Review v30 CHANGELOG for breaking changes
- [ ] Check `RAMPS_CONTROLLER_REQUIRED_SERVICE_ACTIONS` for new requirements
- [ ] Test v30 locally with `yarn add @metamask/ramps-controller@^30.0.0`

### Upgrade Implementation
- [ ] Update `package.json`: `"@metamask/ramps-controller": "^30.0.0"`
- [ ] Remove temporary comments from `BuildQuote.tsx` about v30
- [ ] Enable skipped tests in `BuildQuote.test.tsx` (search for `TRAM-4119`)
- [ ] Verify mobile's asset-based fallbacks don't conflict with controller's quote-based switching
- [ ] Run full test suite: `yarn test:unit`
- [ ] Test manually: auto-selected provider with no quote should switch
- [ ] Test manually: manually-selected provider with no quote should NOT switch

### Post-Upgrade Validation
- [ ] Confirm no duplicate provider switching (mobile UI vs controller)
- [ ] Regression test: manual provider selection preserved
- [ ] Regression test: auto-selection still works on first load
- [ ] Check that "Token Not Available" modal logic still works (asset-based)

### Files Prepared for v30
- [x] `BuildQuote.tsx`: Added comments explaining v30 quote-based switching
- [x] `BuildQuote.test.tsx`: Added skipped tests for v30 behavior
- [x] `TRAM-4119-investigation.md`: Full investigation documentation
- [x] `RAMPS_CONTROLLER_UPGRADE.md`: This upgrade plan

### Notes
- Mobile's asset-based provider switching (for token availability) is separate from v30's quote-based switching
- Asset-based: Runs before quotes, checks payment methods and `supportedCryptoCurrencies`
- Quote-based: Runs after quotes, switches when auto-selected provider has no quote
- Both can coexist without conflict

## Related PRs
- This PR (TRAM-4119): Documentation and prep for v30
- Future PR: Actual v30 upgrade when published
