import type { EnrolledCredential } from '@metamask/profile-sync-controller/sdk';
import { renderHookWithProvider } from '../../test/renderWithProvider';
import { mobileMfaControllerAdapter } from './bindings';
import { startMfaFlow } from './engine/activeFlow';
import Logger from '../../Logger';
import { useMfa } from './useMfa';

jest.mock('./engine/activeFlow', () => ({
  startMfaFlow: jest.fn(),
}));

jest.mock('./bindings', () => ({
  mobileMfaControllerAdapter: {},
}));

jest.mock('../../Logger', () => ({ error: jest.fn() }));

const mockStartMfaFlow = jest.mocked(startMfaFlow);

const enrolledCredentials: EnrolledCredential[] = [
  { type: 'email_otp', status: 'active', verified: true },
];

const renderUseMfa = () =>
  renderHookWithProvider(() => useMfa(), {
    state: {
      engine: {
        backgroundState: {
          AuthenticationController: { isSignedIn: true, enrolledCredentials },
        },
      },
    },
  }).result.current;

describe('useMfa', () => {
  beforeEach(() => {
    mockStartMfaFlow.mockResolvedValue({ credentials: [] });
  });

  it('returns the cached credentials', () => {
    expect(renderUseMfa().credentials).toStrictEqual(enrolledCredentials);
  });

  it('starts a verifyOrEnroll flow on mobile with the feature reason', async () => {
    const reason = { operation: 'vba.activate', enrollDescription: 'Why' };

    await renderUseMfa().verifyOrEnroll({
      reason,
      methods: ['email_otp'],
      verifyWith: 'email_otp',
    });

    expect(mockStartMfaFlow).toHaveBeenCalledWith({
      request: {
        kind: 'verifyOrEnroll',
        methods: ['email_otp'],
        verifyWith: 'email_otp',
      },
      reason,
      platform: 'mobile',
      controller: mobileMfaControllerAdapter,
      reportError: expect.any(Function),
    });
  });

  it('starts an enroll flow with the caller reason', async () => {
    const reason = { operation: 'settings.addEmail' };

    await renderUseMfa().enroll({ method: 'email_otp', reason });

    expect(mockStartMfaFlow).toHaveBeenCalledWith({
      request: { kind: 'enroll', method: 'email_otp' },
      reason,
      platform: 'mobile',
      controller: mobileMfaControllerAdapter,
      reportError: expect.any(Function),
    });
  });

  it('reports bugs to Sentry with searchable tags', async () => {
    await renderUseMfa().enroll({
      method: 'email_otp',
      reason: { operation: 'settings.addEmail' },
    });
    const { reportError } = mockStartMfaFlow.mock.calls[0][0];
    const error = new Error('bad shape');

    reportError?.(error, {
      code: 'invalid_response',
      operation: 'settings.addEmail',
      step: 'otp',
    });

    expect(Logger.error).toHaveBeenCalledWith(error, {
      tags: {
        feature: 'mfa',
        mfaCode: 'invalid_response',
        operation: 'settings.addEmail',
      },
      context: { name: 'mfa_flow', data: { step: 'otp' } },
    });
  });
});
