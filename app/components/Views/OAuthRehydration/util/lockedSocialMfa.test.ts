import {
  MfaError,
  type LoginResponse,
} from '@metamask/profile-sync-controller/sdk';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { createSocialLoginControllerAdapter } from '../../../../util/identity/mfa/bindings';
import {
  getActiveMfaFlow,
  startMfaFlow,
  subscribeToActiveMfaFlow,
} from '../../../../util/identity/mfa/engine/activeFlow';
import type {
  MfaControllerAdapter,
  MfaFlow,
  MfaReason,
} from '../../../../util/identity/mfa/engine/types';
import { mobilePasskeyAdapter } from '../../../../util/identity/mfa/passkeyAdapter';
import {
  listActiveSocialLoginMethods,
  verifyForSocialLogin,
} from './lockedSocialMfa';

jest.mock('../../../../util/identity/mfa/engine/activeFlow', () => ({
  startMfaFlow: jest.fn(),
  getActiveMfaFlow: jest.fn(),
  subscribeToActiveMfaFlow: jest.fn(() => jest.fn()),
}));

jest.mock('../../../../util/identity/mfa/bindings', () => ({
  mobileMfaControllerAdapter: {},
  createSocialLoginControllerAdapter: jest.fn(),
}));

jest.mock('../../../../util/identity/mfa/passkeyAdapter', () => ({
  mobilePasskeyAdapter: {},
}));

jest.mock('../../../../util/Logger', () => ({ error: jest.fn(), log: jest.fn() }));

jest.mock('../../../../core/Engine', () => ({
  context: {
    AuthenticationController: {
      exchangeSocialAccessToken: jest.fn(),
    },
  },
}));

jest.mock('../../../../util/analytics/analytics', () => ({
  analytics: { trackEvent: jest.fn() },
}));

const mockLoginResponse = {} as LoginResponse;
const mockStartMfaFlow = jest.mocked(startMfaFlow);
const socialLoginController = {} as MfaControllerAdapter;

const enrolledCredentials = [
  { id: 'email_otp', type: 'email_otp' as const, status: 'active' as const, verified: true },
];

describe('lockedSocialMfa', () => {
  beforeEach(() => {
    mockStartMfaFlow.mockResolvedValue({ credentials: [] });
    jest.mocked(createSocialLoginControllerAdapter).mockClear();
    jest
      .mocked(createSocialLoginControllerAdapter)
      .mockReturnValue(socialLoginController);
    jest
      .mocked(Engine.context.AuthenticationController.exchangeSocialAccessToken)
      .mockReset()
      .mockResolvedValue(mockLoginResponse);
    jest.mocked(Logger.log).mockClear();
    jest.mocked(getActiveMfaFlow).mockReset().mockReturnValue(undefined);
    jest
      .mocked(subscribeToActiveMfaFlow)
      .mockReset()
      .mockReturnValue(jest.fn());
  });

  describe('listActiveSocialLoginMethods', () => {
    it('returns active methods in cost order from social credentials', async () => {
      const refreshEnrolledCredentials = jest.fn().mockResolvedValue([
        { id: 'email', type: 'email_otp', status: 'active' },
        { id: 'pk', type: 'passkey', status: 'active' },
        { id: 'old', type: 'totp', status: 'disabled' },
      ]);
      jest.mocked(createSocialLoginControllerAdapter).mockReturnValue({
        refreshEnrolledCredentials,
      } as unknown as MfaControllerAdapter);

      expect(await listActiveSocialLoginMethods()).toStrictEqual([
        'passkey',
        'email_otp',
      ]);
    });
  });

  describe('verifyForSocialLogin', () => {
    beforeEach(() => {
      mockStartMfaFlow.mockClear();
    });

    const reason: MfaReason = { operation: 'qa.verifyForSocialLogin' };

    it('pairs the social identifier before starting verify', async () => {
      await verifyForSocialLogin({ reason });

      expect(
        Engine.context.AuthenticationController.exchangeSocialAccessToken,
      ).toHaveBeenCalledTimes(1);
      expect(mockStartMfaFlow).toHaveBeenCalled();
    });

    it('still verifies when social token exchange fails', async () => {
      jest
        .mocked(
          Engine.context.AuthenticationController.exchangeSocialAccessToken,
        )
        .mockRejectedValueOnce(new Error('exchange failed'));

      await verifyForSocialLogin({ reason });

      expect(Logger.log).toHaveBeenCalledWith(
        'OAuthRehydration: social login exchange failed',
        expect.objectContaining({ message: 'exchange failed' }),
      );
      expect(mockStartMfaFlow).toHaveBeenCalled();
    });

    it('starts with passkey so the highest enrolled method opens directly', async () => {
      await verifyForSocialLogin({ reason });

      expect(mockStartMfaFlow).toHaveBeenCalledTimes(1);
      expect(mockStartMfaFlow).toHaveBeenCalledWith({
        request: {
          kind: 'verifyOrEnroll',
          methods: ['passkey'],
          verifyWith: ['passkey'],
          verifyOnly: true,
        },
        reason,
        platform: 'mobile',
        controller: socialLoginController,
        passkey: mobilePasskeyAdapter,
        reportError: expect.any(Function),
        trackEvent: expect.any(Function),
      });
    });

    it('verifies only the requested method from the custom picker', async () => {
      await verifyForSocialLogin({
        reason,
        method: 'totp',
      });

      expect(mockStartMfaFlow).toHaveBeenCalledTimes(1);
      expect(mockStartMfaFlow).toHaveBeenCalledWith(
        expect.objectContaining({
          request: {
            kind: 'verifyOrEnroll',
            methods: ['totp'],
            verifyWith: ['totp'],
            verifyOnly: true,
          },
        }),
      );
    });

    it('tries the next method when the higher one is not enrolled', async () => {
      mockStartMfaFlow
        .mockRejectedValueOnce(
          new MfaError('credential_not_enrolled', 'no passkey'),
        )
        .mockResolvedValueOnce({ credentials: enrolledCredentials });

      expect(await verifyForSocialLogin({ reason })).toStrictEqual({
        credentials: enrolledCredentials,
        verifiedMethod: 'totp',
      });

      expect(mockStartMfaFlow).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          request: {
            kind: 'verifyOrEnroll',
            methods: ['totp'],
            verifyWith: ['totp'],
            verifyOnly: true,
          },
        }),
      );
    });

    it('resolves with the flow result', async () => {
      mockStartMfaFlow.mockResolvedValue({ credentials: enrolledCredentials });

      expect(await verifyForSocialLogin({ reason })).toStrictEqual({
        credentials: enrolledCredentials,
        verifiedMethod: 'passkey',
      });
    });

    it('uses a new adapter for each verification', async () => {
      await verifyForSocialLogin({ reason });
      await verifyForSocialLogin({ reason });

      expect(createSocialLoginControllerAdapter).toHaveBeenCalledTimes(2);
    });

    it('rethrows a non-enrollment MFA error without trying later methods', async () => {
      const flowError = new MfaError('flow_cancelled', 'user backed out');
      mockStartMfaFlow.mockRejectedValueOnce(flowError);

      await expect(verifyForSocialLogin({ reason })).rejects.toBe(flowError);
      expect(mockStartMfaFlow).toHaveBeenCalledTimes(1);
    });

    it('tries email OTP after passkey and totp are not enrolled', async () => {
      mockStartMfaFlow
        .mockRejectedValueOnce(
          new MfaError('credential_not_enrolled', 'no passkey'),
        )
        .mockRejectedValueOnce(
          new MfaError('credential_not_enrolled', 'no totp'),
        )
        .mockResolvedValueOnce({ credentials: enrolledCredentials });

      expect(await verifyForSocialLogin({ reason })).toStrictEqual({
        credentials: enrolledCredentials,
        verifiedMethod: 'email_otp',
      });

      expect(mockStartMfaFlow).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          request: {
            kind: 'verifyOrEnroll',
            methods: ['email_otp'],
            verifyWith: ['email_otp'],
            verifyOnly: true,
          },
        }),
      );
    });

    it('throws the last enrollment error when no method is enrolled', async () => {
      const lastError = new MfaError('credential_not_enrolled', 'no email otp');
      mockStartMfaFlow
        .mockRejectedValueOnce(
          new MfaError('credential_not_enrolled', 'no passkey'),
        )
        .mockRejectedValueOnce(
          new MfaError('credential_not_enrolled', 'no totp'),
        )
        .mockRejectedValueOnce(lastError);

      await expect(verifyForSocialLogin({ reason })).rejects.toBe(lastError);
      expect(mockStartMfaFlow).toHaveBeenCalledTimes(3);
    });

    it('does not try email when the caller omits it', async () => {
      const lastError = new MfaError('credential_not_enrolled', 'no totp');
      mockStartMfaFlow
        .mockRejectedValueOnce(
          new MfaError('credential_not_enrolled', 'no passkey'),
        )
        .mockRejectedValueOnce(lastError);

      await expect(
        verifyForSocialLogin({
          reason,
          methods: ['passkey', 'totp'],
        }),
      ).rejects.toBe(lastError);
      expect(mockStartMfaFlow).toHaveBeenCalledTimes(2);
      expect(mockStartMfaFlow).not.toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({
            methods: ['email_otp'],
          }),
        }),
      );
    });

    it('prefers an explicit method over the methods list', async () => {
      await verifyForSocialLogin({
        reason,
        method: 'totp',
        methods: ['passkey'],
      });

      expect(mockStartMfaFlow).toHaveBeenCalledTimes(1);
      expect(mockStartMfaFlow).toHaveBeenCalledWith(
        expect.objectContaining({
          request: {
            kind: 'verifyOrEnroll',
            methods: ['totp'],
            verifyWith: ['totp'],
            verifyOnly: true,
          },
        }),
      );
    });

    it('ends the kit flow when OS passkey cancel lands on the passkey retry step', async () => {
      const dispatch = jest.fn();
      const unsubscribeActive = jest.fn();
      const unsubscribeFlowState = jest.fn();
      let onFlowStateChange: (() => void) | undefined;
      let flowState = {
        step: { name: 'passkey' as const, purpose: 'verify' as const },
        busy: false,
        error: undefined as
          | 'passkey_ceremony_cancelled'
          | 'invalid_assertion'
          | undefined,
        progress: { current: 1, total: 1 },
      };
      const flow = {
        reason,
        getState: () => flowState,
        subscribe: (listener: () => void) => {
          onFlowStateChange = listener;
          return unsubscribeFlowState;
        },
        dispatch,
      } as unknown as MfaFlow;

      jest.mocked(subscribeToActiveMfaFlow).mockImplementation((listener) => {
        // Active-flow pointer change only — state updates use flow.subscribe.
        listener();
        return unsubscribeActive;
      });
      jest.mocked(getActiveMfaFlow).mockReturnValue(flow);

      const flowCancelled = new MfaError('flow_cancelled', 'ended');
      mockStartMfaFlow.mockImplementation(async () => {
        flowState = {
          ...flowState,
          error: 'passkey_ceremony_cancelled',
        };
        onFlowStateChange?.();
        throw flowCancelled;
      });

      await expect(verifyForSocialLogin({ reason })).rejects.toBe(
        flowCancelled,
      );
      expect(dispatch).toHaveBeenCalledWith({ type: 'cancel' });
      expect(unsubscribeActive).toHaveBeenCalled();
      expect(unsubscribeFlowState).toHaveBeenCalled();
      expect(Logger.log).toHaveBeenCalledWith(
        'OAuthRehydration: ending kit flow after OS passkey cancel',
        expect.objectContaining({ operation: reason.operation }),
      );
    });

    it('does not cancel the kit flow for non-cancel passkey errors', async () => {
      const dispatch = jest.fn();
      let onFlowStateChange: (() => void) | undefined;
      const flowState = {
        step: { name: 'passkey' as const, purpose: 'verify' as const },
        busy: false,
        error: 'invalid_assertion' as const,
        progress: { current: 1, total: 1 },
      };
      jest.mocked(subscribeToActiveMfaFlow).mockImplementation((listener) => {
        listener();
        return jest.fn();
      });
      jest.mocked(getActiveMfaFlow).mockReturnValue({
        reason,
        getState: () => flowState,
        subscribe: (listener: () => void) => {
          onFlowStateChange = listener;
          return jest.fn();
        },
        dispatch,
      } as unknown as MfaFlow);

      const assertionError = new MfaError('invalid_assertion', 'bad passkey');
      mockStartMfaFlow.mockImplementation(async () => {
        onFlowStateChange?.();
        throw assertionError;
      });

      await expect(verifyForSocialLogin({ reason })).rejects.toBe(
        assertionError,
      );
      expect(dispatch).not.toHaveBeenCalled();
    });

    it('does not watch for OS passkey cancel on non-passkey attempts', async () => {
      await verifyForSocialLogin({ reason, method: 'totp' });

      expect(subscribeToActiveMfaFlow).not.toHaveBeenCalled();
    });
  });
});
