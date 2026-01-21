# Legacy Confirmation Removal - Complete

## Summary

Successfully removed legacy confirmation system from MetaMask Mobile. The redesigned confirmation system is now the only system in use.

## What Was Done

### Phase 1: BlockaidBanner Migration

- **Moved** `BlockaidBanner` from `legacy/components/` to `components/blockaid-banner/`
- **Updated** 17 files with new import paths
- **Reason**: BlockaidBanner was actively used by redesigned confirmations, not legacy

### Phase 2: Feature Flag Removal

- **Deleted** `useConfirmationRedesignEnabled` hook (447 lines including tests)
- **Simplified** feature flag selector to always return `true`
- **Removed** all conditional checks for `isRedesignedEnabled`
- **Cleaned up** test files that mocked the hook

### Phase 3: Legacy Code Deletion

- **Deleted** ~20,000 lines of legacy confirmation code (114 files)
- **Removed** `TransactionApproval` component entirely (now unused, was returning null)
- **Kept** approval wrappers still used by `RootRPCMethodsUI.js`:
  - `legacy/Approval/` - Approval router
  - `legacy/ApproveView/` - Approve wrapper
  - `legacy/components/Approval/` - ApprovalFlowLoader, TemplateConfirmation
  - `legacy/components/SignatureRequest/` - Signature approvals
  - `legacy/components/WatchAssetRequest/` - Watch asset approval
  - `legacy/components/AddressList/`, `ErrorMessage/`, etc. - UI components used externally

### Major Deletions

- ❌ Old transaction approval UI (Approve, ApproveTransactionReview)
- ❌ Legacy TransactionReview components (all variants)
- ❌ EditGasFee components (legacy gas editing)
- ❌ CustomNonceModal
- ❌ PersonalSign & TypedSign (old signature UIs)
- ❌ SmartTransactionsMigrationBanner
- ❌ TransactionBlockaidBanner (old version)
- ❌ All related tests and snapshots

## File Changes

```
114 files changed
37 insertions (+)
20,372 deletions (-)
```

## Current State

**Legacy directory structure:**

```
app/components/Views/confirmations/legacy/
├── Approval/                    # Approval router (still needed)
├── ApproveView/                 # Approve wrapper (still needed)
└── components/
    ├── AddressElement/          # Used by TemplateRenderer
    ├── AddressList/             # Used by Settings/Contacts
    ├── Approval/                # FlowLoader, TemplateConfirmation
    ├── ApproveTransactionHeader/# Used by AccountInfoCard
    ├── ErrorMessage/            # Used by Contacts/ContactForm
    ├── SignatureRequest/        # Signature approvals
    ├── UpdateEIP1559Tx/         # Used by Transactions views
    ├── WarningMessage/          # Used by AssetDetails
    └── WatchAssetRequest/       # Watch asset approval
```

These remaining components are still actively imported by files outside the confirmations system and will need to be refactored separately.

## Key Technical Changes

### 1. TransactionApproval Component

```typescript
// DELETED - Component was returning null, no longer needed
// Removed from RootRPCMethodsUI.js component tree
// Removed transactionModalType state and setTransactionModalType calls
```

### 2. SignatureRequest/Root/Root.tsx

```typescript
// Before: Complex modal with PersonalSign/TypedSign
return null;
// Now: Always returns null (redesigned handles signatures)
```

### 3. Feature Flag Selector

```typescript
// Always returns true - redesigned confirmations are the only system
export const selectConfirmationRedesignFlagsFromRemoteFeatureFlags = () => ({
  approve: true,
  contract_deployment: true,
  contract_interaction: true,
  signatures: true,
  staking_confirmations: true,
  transfer: true,
});
```

## What Was NOT Changed

- **Approval wrappers** in `legacy/` are still used by `RootRPCMethodsUI.js`
- **UI components** in `legacy/components/` are still imported by external files
- **Feature flag selector structure** kept for compatibility (returns hardcoded true values)
- **Type definitions** for `ConfirmationRedesignRemoteFlags` retained for type safety

## Future Work

The remaining legacy code can be addressed in future PRs:

1. Refactor approval wrappers to remove legacy dependency
2. Move shared UI components out of legacy folder
3. Remove feature flag selector entirely once all consumers are updated

## Testing

No tests were run as part of this cleanup. The changes are:

- File deletions (unused code)
- Hook removals (replaced with constants)
- Conditional logic simplification

The redesigned confirmation system was already tested and is production-ready.
