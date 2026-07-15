/**
 * In-memory user store. Throwaway: process restart wipes everything.
 *
 * Keyed by `externalUserId` (the mobile-supplied stable id, e.g. the MetaMask
 * EVM address). Each entry holds the Kalshi `user_id`, current setup step,
 * profile snapshot, mint per-user PEM (once KYC approves), payout method id
 * (once the wallet registers), etc.
 */

export type SetupStep =
  | 'email_otp'
  | 'profile_form'
  | 'phone_otp'
  | 'phone_otp_verify'
  | 'kyc'
  | 'link_verify'
  | 'complete';

export interface UserRecord {
  externalUserId: string;
  email: string;
  /** Kalshi user_id once /users/create or /users/link/verify succeeds. */
  kalshiUserId?: string;
  /** UUID returned by /users/link, required as the second-step body. */
  pendingLinkId?: string;
  /** Tracks the next canonical step to surface to the UI. */
  setupStep: SetupStep;
  /** Path A (new user) vs Path B (existing user link). */
  path: 'A' | 'B';
  profile?: ProfileDraft;
  /** Per-user PEM minted once KYC is approved. */
  apiKey?: {
    keyId: string;
    pem: string;
    scopes: string[];
    createdAt: number;
  };
  /** Cached deposit references for /funding/submit lookups. */
  deposits: Record<string, { depositId: string; amountCents: number; network: string }>;
  /** Cached payout_method_id keyed by network for idempotent withdraws. */
  payoutMethods: Record<string, string>;
  subaccountNumber?: number;
}

export interface ProfileDraft {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phoneNumber: string;
  ssn: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

const byExternalId = new Map<string, UserRecord>();

export function getOrCreateUser(externalUserId: string, email?: string): UserRecord {
  let user = byExternalId.get(externalUserId);
  if (!user) {
    user = {
      externalUserId,
      email: email ?? '',
      setupStep: 'email_otp',
      path: 'A',
      deposits: {},
      payoutMethods: {},
    };
    byExternalId.set(externalUserId, user);
  } else if (email && !user.email) {
    user.email = email;
  }
  return user;
}

export function getUser(externalUserId: string): UserRecord | undefined {
  return byExternalId.get(externalUserId);
}

export function requireUser(externalUserId: string): UserRecord {
  const user = byExternalId.get(externalUserId);
  if (!user) {
    throw new Error(`Unknown externalUserId: ${externalUserId}`);
  }
  return user;
}
