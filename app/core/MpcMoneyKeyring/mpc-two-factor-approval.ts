import type {
  MfaApproval,
  RequestMfaApprovalRequest,
} from '@metamask/profile-sync-controller/sdk';
import { bytesToHex } from '@metamask/utils';

/** The dev MPC service, as the auth API lists it in its allowed audiences. */
export const MPC_APPROVAL_AUDIENCE = 'mpc-service.dev-api.cx.metamask.io';

export interface MpcTwoFactorApprovalOptions {
  requestMfaApproval: (
    request: RequestMfaApprovalRequest,
  ) => Promise<MfaApproval>;
  /** Runs a fresh 2-step verification prompt. */
  verify: () => Promise<void>;
}

// Every signature gets its own verification, so it always prompts.
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
