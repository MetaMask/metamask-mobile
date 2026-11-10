import { startMfaFlow } from './engine/activeFlow';
import { MfaFlowError } from './engine/errors';
import { createSocialLockedMfaControllerAdapter } from './socialLockedBindings';
import {
  verifySocialLoginFactorWhileLocked,
  verifySocialLoginWhileLocked,
} from './verifySocialLoginWhileLocked';
import type { MfaReason } from './engine/types';

jest.mock('./socialLockedBindings', () => ({
  createSocialLockedMfaControllerAdapter: jest.fn(),
}));

jest.mock('./engine/activeFlow', () => ({
  startMfaFlow: jest.fn(),
}));

jest.mock('./passkeyAdapter', () => ({
  mobilePasskeyAdapter: {},
}));

jest.mock('../../Logger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../analytics/analytics', () => ({
  analytics: {
    trackEvent: jest.fn(),
  },
}));

jest.mock('../../analytics/AnalyticsEventBuilder', () => ({
  AnalyticsEventBuilder: {
    createEventBuilder: () => ({
      addProperties: () => ({
        build: () => ({}),
      }),
    }),
  },
}));

const mockCreateAdapter = jest.mocked(createSocialLockedMfaControllerAdapter);
const mockStartMfaFlow = jest.mocked(startMfaFlow);

const reason: MfaReason = {
  operation: 'settings.social_mfa_verify',
  presentation: 'modal',
};

const mockRefresh = jest.fn();

const mockLockedAdapter = () =>
  ({
    refreshEnrolledCredentials: mockRefresh,
  }) as unknown as ReturnType<typeof createSocialLockedMfaControllerAdapter>;

describe('verifySocialLoginWhileLocked', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateAdapter.mockReturnValue(mockLockedAdapter());
  });

  it('opens passkey first and returns verified on success', async () => {
    mockRefresh.mockResolvedValue([
      { id: '1', type: 'passkey', status: 'active' },
      { id: '2', type: 'totp', status: 'active' },
    ]);
    const result = { kind: 'verifyOrEnroll', verified: ['passkey'] };
    mockStartMfaFlow.mockResolvedValue(result as never);

    await expect(verifySocialLoginWhileLocked(reason)).resolves.toEqual({
      status: 'verified',
      result,
    });
    expect(mockStartMfaFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          methods: ['passkey'],
          verifyWith: 'passkey',
        }),
      }),
    );
  });

  it('returns fallback when passkey is cancelled', async () => {
    mockRefresh.mockResolvedValue([
      { id: '1', type: 'passkey', status: 'active' },
      { id: '2', type: 'email_otp', status: 'active' },
    ]);
    mockStartMfaFlow.mockRejectedValue(new MfaFlowError('flow_cancelled'));

    await expect(verifySocialLoginWhileLocked(reason)).resolves.toEqual({
      status: 'fallback',
      methods: ['passkey', 'email_otp'],
    });
  });

  it('returns fallback directly when there is no passkey', async () => {
    mockRefresh.mockResolvedValue([
      { id: '2', type: 'totp', status: 'active' },
    ]);

    await expect(verifySocialLoginWhileLocked(reason)).resolves.toEqual({
      status: 'fallback',
      methods: ['totp'],
    });
    expect(mockStartMfaFlow).not.toHaveBeenCalled();
  });

  it('skips when no active methods are enrolled', async () => {
    mockRefresh.mockResolvedValue([]);

    await expect(verifySocialLoginWhileLocked(reason)).resolves.toEqual({
      status: 'skipped',
      reason: 'no_methods',
    });
  });

  it('skips when listing credentials fails', async () => {
    mockRefresh.mockRejectedValue(new Error('network down'));

    await expect(verifySocialLoginWhileLocked(reason)).resolves.toEqual({
      status: 'skipped',
      reason: 'list_failed',
    });
  });

  it('retries briefly when social state is not ready yet', async () => {
    jest.useFakeTimers();
    mockRefresh
      .mockRejectedValueOnce(new Error('the wallet has no social login'))
      .mockResolvedValueOnce([{ id: '1', type: 'passkey', status: 'active' }]);
    mockStartMfaFlow.mockResolvedValue({
      kind: 'verifyOrEnroll',
      verified: ['passkey'],
    } as never);

    const pending = verifySocialLoginWhileLocked(reason);
    await jest.advanceTimersByTimeAsync(400);
    await expect(pending).resolves.toMatchObject({
      status: 'verified',
    });
    expect(mockRefresh).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });
});

describe('verifySocialLoginFactorWhileLocked', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateAdapter.mockReturnValue(mockLockedAdapter());
  });

  it('verifies a single factor', async () => {
    const result = { kind: 'verifyOrEnroll', verified: ['totp'] };
    mockStartMfaFlow.mockResolvedValue(result as never);

    await expect(
      verifySocialLoginFactorWhileLocked(reason, 'totp'),
    ).resolves.toEqual({ status: 'verified', result });
    expect(mockStartMfaFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          methods: ['totp'],
          verifyWith: 'totp',
        }),
      }),
    );
  });

  it('returns cancelled when the user dismisses the factor', async () => {
    mockStartMfaFlow.mockRejectedValue(new MfaFlowError('flow_cancelled'));

    await expect(
      verifySocialLoginFactorWhileLocked(reason, 'passkey'),
    ).resolves.toEqual({ status: 'cancelled' });
  });

  it('returns failed for non-cancel errors', async () => {
    const error = new Error('boom');
    mockStartMfaFlow.mockRejectedValue(error);

    await expect(
      verifySocialLoginFactorWhileLocked(reason, 'email_otp'),
    ).resolves.toEqual({ status: 'failed', error });
  });
});
