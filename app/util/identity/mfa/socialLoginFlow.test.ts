import type { EnrolledCredential } from '@metamask/profile-sync-controller/sdk';
import Engine from '../../../core/Engine';
import { createSocialLoginControllerAdapter } from './bindings';
import { createMfaFlow } from './engine/flow';
import type { MfaFlow } from './engine/types';

jest.mock('../../../core/Engine', () => ({
  context: {
    AuthenticationController: {
      refreshSocialLoginCredentials: jest.fn(),
      beginSocialLoginVerification: jest.fn(),
      completeSocialLoginVerification: jest.fn(),
    },
  },
}));

const controller = jest.mocked(Engine.context.AuthenticationController);

const credentials: EnrolledCredential[] = [
  { id: 'email_otp', type: 'email_otp', status: 'active', verified: true },
];

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const act = async (
  flow: MfaFlow,
  action: Parameters<MfaFlow['dispatch']>[0],
) => {
  flow.dispatch(action);
  await flush();
};

describe('verifying with a social login while the wallet is locked', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('finishes after the code is accepted, without starting another verification', async () => {
    // Like the locked controller: it verifies but opens no verification
    // session, so the adapter has to hold the token the flow earned.
    const token = {
      accessToken: 'token',
      expiresIn: 900,
      obtainedAt: Date.now(),
      claims: {
        sub: 'profile',
        amr: ['email_otp'],
        exp: Math.floor(Date.now() / 1000) + 900,
      },
    };
    controller.refreshSocialLoginCredentials.mockResolvedValue(credentials);
    controller.beginSocialLoginVerification.mockResolvedValue({
      type: 'email_otp',
      flowId: 'flow-1',
      expiresAt: Date.now() + 600_000,
    });
    controller.completeSocialLoginVerification.mockResolvedValue(token);
    const flow = createMfaFlow({
      request: {
        kind: 'verifyOrEnroll',
        methods: ['email_otp'],
        verifyWith: ['email_otp'],
      },
      reason: { operation: 'qa.test' },
      platform: 'mobile',
      controller: createSocialLoginControllerAdapter(),
      now: () => Date.now(),
    });
    const outcome = flow.result.then(
      (value) => ({ ok: true as const, value }),
      (error) => ({ ok: false as const, error }),
    );

    await flow.start();
    await flush();
    await act(flow, { type: 'submitCode', code: '123456' });

    expect(await outcome).toStrictEqual({
      ok: true,
      value: { credentials, token },
    });
    expect(controller.beginSocialLoginVerification).toHaveBeenCalledTimes(1);
    expect(controller.completeSocialLoginVerification).toHaveBeenCalledTimes(1);
  });
});
