/**
 * Vendored from metamask-extension shared/lib/activity/adapters/constants.ts
 * Branch: origin/n3ps/activity-v3-prototype
 * TODO: Replace with shared @metamask/activity-adapters package when published.
 */

// Known method IDs for supply/deposit calls
export const supplyMethodIds = new Set(['0x617ba037', '0xa1903eab']);

// Known method IDs for withdraw calls
export const withdrawMethodIds = new Set(['0x69328dec']);

// WETH9-style wrap / unwrap (deposit / withdraw)
export const wrapMethodIds = new Set(['0xd0e30db0']);
export const unwrapMethodIds = new Set(['0x2e1a7d4d']);
