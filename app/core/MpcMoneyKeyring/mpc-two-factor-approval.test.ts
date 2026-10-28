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
  it('verifies, then returns the approval bound to the signature hash', async () => {
    const calls: string[] = [];
    const verify = jest.fn(async () => {
      calls.push('verify');
    });
    const requestMfaApproval = jest.fn(async () => {
      calls.push('approval');
      return { approval: 'approval-token', expiresIn: 60 };
    });

    const approval = await createMpcTwoFactorApproval({
      requestMfaApproval,
      verify,
    })(HASH);

    expect(approval).toBe('approval-token');
    expect(requestMfaApproval).toHaveBeenCalledWith(expectedRequest);
    expect(calls).toStrictEqual(['verify', 'approval']);
  });

  it('verifies again for every signature', async () => {
    const verify = jest.fn().mockResolvedValue(undefined);
    const requestMfaApproval = jest
      .fn()
      .mockResolvedValue({ approval: 'approval-token', expiresIn: 60 });
    const approve = createMpcTwoFactorApproval({ requestMfaApproval, verify });

    await approve(HASH);
    await approve(HASH);

    expect(verify).toHaveBeenCalledTimes(2);
  });

  it('does not request an approval when verification fails', async () => {
    const verify = jest.fn().mockRejectedValue(new Error('flow_cancelled'));
    const requestMfaApproval = jest.fn();

    await expect(
      createMpcTwoFactorApproval({ requestMfaApproval, verify })(HASH),
    ).rejects.toThrow('flow_cancelled');
    expect(requestMfaApproval).not.toHaveBeenCalled();
  });
});
