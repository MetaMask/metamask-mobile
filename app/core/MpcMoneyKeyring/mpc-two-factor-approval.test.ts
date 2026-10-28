import { StepUpRequiredError } from '@metamask/profile-sync-controller/sdk';
import {
  createMpcTwoFactorApproval,
  MPC_APPROVAL_AUDIENCE,
} from './mpc-two-factor-approval';

const HASH = new Uint8Array(32).fill(0xab);
const HASH_HEX = `0x${'ab'.repeat(32)}`;

const expectedRequest = {
  requestHash: HASH_HEX,
  audiences: [MPC_APPROVAL_AUDIENCE],
  requireVerification: true,
  includeIdentifiers: false,
  reason: { operation: 'money.mpcSign' },
};

describe('createMpcTwoFactorApproval', () => {
  it('returns the approval bound to the signature hash', async () => {
    const requestMfaApproval = jest
      .fn()
      .mockResolvedValue({ approval: 'approval-token', expiresIn: 60 });
    const verify = jest.fn();

    const approval = await createMpcTwoFactorApproval({
      requestMfaApproval,
      verify,
    })(HASH);

    expect(approval).toBe('approval-token');
    expect(requestMfaApproval).toHaveBeenCalledWith(expectedRequest);
    expect(verify).not.toHaveBeenCalled();
  });

  it('verifies and asks again when a verification is required', async () => {
    const requestMfaApproval = jest
      .fn()
      .mockRejectedValueOnce(new StepUpRequiredError('aal2_required'))
      .mockResolvedValueOnce({ approval: 'approval-token', expiresIn: 60 });
    const verify = jest.fn().mockResolvedValue(undefined);

    const approval = await createMpcTwoFactorApproval({
      requestMfaApproval,
      verify,
    })(HASH);

    expect(approval).toBe('approval-token');
    expect(verify).toHaveBeenCalledTimes(1);
    expect(requestMfaApproval).toHaveBeenCalledTimes(2);
  });

  it('rethrows other errors without verifying', async () => {
    const requestMfaApproval = jest
      .fn()
      .mockRejectedValue(new Error('network down'));
    const verify = jest.fn();

    await expect(
      createMpcTwoFactorApproval({ requestMfaApproval, verify })(HASH),
    ).rejects.toThrow('network down');
    expect(verify).not.toHaveBeenCalled();
  });
});
