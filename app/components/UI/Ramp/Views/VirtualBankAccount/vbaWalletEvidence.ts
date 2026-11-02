import type {
  AutorampAccount,
  MoneyAccountWalletRegistration,
} from '@metamask/ramps-controller';

/**
 * Case-insensitive wallet match, mirroring how `RampsController` scopes
 * autoramps and registrations to a wallet (`walletAddress.trim().toLowerCase()`).
 */
export const matchesVbaWallet = (
  walletAddress: string,
  candidate: string,
): boolean =>
  candidate.trim().toLowerCase() === walletAddress.trim().toLowerCase();

/**
 * Whether the wallet has an autoramp or a Money Account registration row.
 * Either one is durable evidence that VBA onboarding happened for this wallet,
 * even when the persisted KYC session is gone. A `disabled` registration still
 * counts.
 */
export const hasVbaWalletEvidence = (
  walletAddress: string,
  autoramps: readonly AutorampAccount[],
  walletRegistrations: readonly MoneyAccountWalletRegistration[],
): boolean =>
  autoramps.some((autoramp) =>
    matchesVbaWallet(walletAddress, autoramp.walletAddress),
  ) ||
  walletRegistrations.some((registration) =>
    matchesVbaWallet(walletAddress, registration.walletAddress),
  );
