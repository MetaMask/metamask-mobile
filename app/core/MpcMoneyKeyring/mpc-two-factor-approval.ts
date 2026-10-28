import type {
  MfaApproval,
  RequestMfaApprovalRequest,
} from '@metamask/profile-sync-controller/sdk';
import { bytesToHex } from '@metamask/utils';

/** Audience the dev MPC service accepts for 2FA approvals. */
export const MPC_APPROVAL_AUDIENCE =
  'https://oidc.dev-api.cx.metamask.io/oauth2/token';

export interface MpcTwoFactorApprovalOptions {
  requestMfaApproval: (
    request: RequestMfaApprovalRequest,
  ) => Promise<MfaApproval>;
  /** Runs a fresh 2-step verification prompt. */
  verify: () => Promise<void>;
}

/**
 * Returns a function that gets a one-time approval for an MPC signature,
 * bound to its hash. Every signature gets its own verification, so it always
 * prompts first.
 *
 * @param options - Approval and verification calls.
 * @param options.requestMfaApproval - Requests the approval from the auth API.
 * @param options.verify - Runs a fresh 2-step verification prompt.
 * @returns A function from the signature hash to the approval token.
 */
export const createMpcTwoFactorApproval =
  ({ requestMfaApproval, verify }: MpcTwoFactorApprovalOptions) =>
  async (hash: Uint8Array): Promise<string> => {
    const request: RequestMfaApprovalRequest = {
      requestHash: bytesToHex(hash),
      audiences: [MPC_APPROVAL_AUDIENCE],
      requireVerification: true,
      includeIdentifiers: false,
      reason: { operation: 'money.mpcSign' },
    };
    await verify();
    return (await requestMfaApproval(request)).approval;
  };
