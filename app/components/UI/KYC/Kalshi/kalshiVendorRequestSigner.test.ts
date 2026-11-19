import { KycApiError } from '@metamask/kyc-controller';
import {
  createKalshiVendorRequestSigner,
  runKalshiSignedAction,
} from './kalshiVendorRequestSigner';

const mockSignOnboardingRequest = jest.fn();

jest.mock('../../PredictNext/adapters/remote/kalshiOnboardingSigner', () => ({
  ...jest.requireActual(
    '../../PredictNext/adapters/remote/kalshiOnboardingSigner',
  ),
  signOnboardingRequest: (...args: unknown[]) =>
    mockSignOnboardingRequest(...args),
}));

jest.mock('uuid', () => {
  let count = 0;
  return { v4: () => `key-${(count += 1)}` };
});

const mockCall = jest.fn();
jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: { call: (...args: unknown[]) => mockCall(...args) },
  },
}));

describe('createKalshiVendorRequestSigner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCall.mockImplementation((action: string) => {
      if (action === 'PredictDeviceAuthService:getA2t') {
        return Promise.resolve('a2t-token');
      }
      if (action === 'PredictDeviceAuthService:ensureDeviceKey') {
        return Promise.resolve({ publicKey: 'device-key', salt: 'salt' });
      }
      return Promise.resolve(undefined);
    });
    mockSignOnboardingRequest.mockImplementation((request: { path: string }) =>
      Promise.resolve({
        requestId: `req:${request.path}`,
        signatureInput: 'kalshi=(input)',
        signature: 'kalshi=:sig:',
      }),
    );
  });

  it('signs the intent and the link into relay requests, and does not send them', async () => {
    const signer = createKalshiVendorRequestSigner();

    const signed = await signer({
      vendor: 'kalshi',
      requests: [
        { operation: 'enrollment/intents' },
        { operation: 'users/link', email: '  a@b.co ' },
      ],
    });

    expect(signed).toMatchInlineSnapshot(`
      [
        {
          "body": "",
          "headers": {
            "Authorization": "Kalshi-A2T a2t-token",
            "Content-Digest": "sha-256=:47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=:",
            "Content-Type": "application/json",
            "Idempotency-Key": "key-1",
            "Kalshi-Device-Key": "device-key",
            "Kalshi-Device-Key-Salt": "salt",
            "Kalshi-Device-Request-Id": "req:/trade-api/v2/isv/enrollment/intents",
            "Signature": "kalshi=:sig:",
            "Signature-Input": "kalshi=(input)",
          },
          "path": "/trade-api/v2/isv/enrollment/intents",
        },
        {
          "body": "{"email":"a@b.co"}",
          "headers": {
            "Authorization": "Kalshi-A2T a2t-token",
            "Content-Digest": "sha-256=:mBXW/A75ypi+VbkgivQFSD4kuoc5MJu3z3fUvXR0e4Q=:",
            "Content-Type": "application/json",
            "Idempotency-Key": "key-2",
            "Kalshi-Device-Key": "device-key",
            "Kalshi-Device-Key-Salt": "salt",
            "Kalshi-Device-Request-Id": "req:/trade-api/v2/isv/users/link",
            "Signature": "kalshi=:sig:",
            "Signature-Input": "kalshi=(input)",
          },
          "path": "/trade-api/v2/isv/users/link",
        },
      ]
    `);
    expect(mockSignOnboardingRequest).toHaveBeenCalledTimes(2);
    expect(mockCall).not.toHaveBeenCalledWith('PredictDeviceAuthService:clear');
  });

  it('signs the verification code into the body and sends no otp', async () => {
    const signer = createKalshiVendorRequestSigner();

    const signed = await signer({
      vendor: 'kalshi',
      requests: [{ operation: 'users/link/verify', code: ' 888888 ' }],
    });

    expect(signed).toMatchInlineSnapshot(`
      [
        {
          "body": "{"code":"888888"}",
          "headers": {
            "Authorization": "Kalshi-A2T a2t-token",
            "Content-Digest": "sha-256=:kPo2XBATxMc1ERY+FzFbaRYLN5ptMTmUmsqNskVDTRo=:",
            "Content-Type": "application/json",
            "Idempotency-Key": "key-3",
            "Kalshi-Device-Key": "device-key",
            "Kalshi-Device-Key-Salt": "salt",
            "Kalshi-Device-Request-Id": "req:/trade-api/v2/isv/users/link/verify",
            "Signature": "kalshi=:sig:",
            "Signature-Input": "kalshi=(input)",
          },
          "path": "/trade-api/v2/isv/users/link/verify",
        },
      ]
    `);
  });

  it.each([
    ['an intent', { operation: 'users/link' as const }, 'needs an email'],
    ['a code', { operation: 'users/link/verify' as const }, 'needs a code'],
  ])('refuses to sign without %s', async (_name, request, message) => {
    const signer = createKalshiVendorRequestSigner();

    await expect(
      signer({ vendor: 'kalshi', requests: [request] }),
    ).rejects.toThrow(message);
    expect(mockSignOnboardingRequest).not.toHaveBeenCalled();
  });

  it('refuses an operation it does not know', async () => {
    const signer = createKalshiVendorRequestSigner();

    await expect(
      signer({
        vendor: 'kalshi',
        requests: [{ operation: 'users/unlink' as never }],
      }),
    ).rejects.toThrow('unsupported operation users/unlink');
  });

  it.each([
    'kalshi_signed_request_rejected',
    'kalshi_signed_request_a2t_invalid',
    'kalshi_signed_request_sub_mismatch',
  ])('drops the A2T on %s and signs the call once more', async (code) => {
    const rejected = new KycApiError(400, 'Kalshi refused', code);
    const action = jest
      .fn()
      .mockRejectedValueOnce(rejected)
      .mockResolvedValueOnce('signed');

    await expect(runKalshiSignedAction(action)).resolves.toBe('signed');

    expect(action).toHaveBeenCalledTimes(2);
    expect(mockCall).toHaveBeenCalledWith('PredictDeviceAuthService:clear');
  });

  it('finds the code in the message of a wrapped failure', async () => {
    const rejected = new Error(
      "Fetching '/sessions' failed with status '400': kalshi_signed_request_rejected",
    );
    const action = jest
      .fn()
      .mockRejectedValueOnce(rejected)
      .mockResolvedValueOnce('signed');

    await expect(runKalshiSignedAction(action)).resolves.toBe('signed');

    expect(mockCall).toHaveBeenCalledWith('PredictDeviceAuthService:clear');
  });

  it('still signs once more when dropping the A2T fails', async () => {
    mockCall.mockImplementation((action: string) => {
      if (action === 'PredictDeviceAuthService:clear') {
        throw new Error('engine is not ready');
      }
      return Promise.resolve(undefined);
    });
    const rejected = new KycApiError(
      400,
      'Kalshi refused',
      'kalshi_signed_request_rejected',
    );
    const action = jest
      .fn()
      .mockRejectedValueOnce(rejected)
      .mockResolvedValueOnce('signed');

    await expect(runKalshiSignedAction(action)).resolves.toBe('signed');
  });

  it('does not sign a third time when the fresh A2T is also rejected', async () => {
    const rejected = new KycApiError(
      400,
      'Kalshi refused',
      'kalshi_signed_request_rejected',
    );
    const action = jest.fn().mockRejectedValue(rejected);

    await expect(runKalshiSignedAction(action)).rejects.toBe(rejected);

    expect(action).toHaveBeenCalledTimes(2);
    expect(mockCall).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      'a wrong code',
      new KycApiError(400, 'That code is wrong', 'invalid_or_expired_code'),
    ],
    [
      'a session that is not waiting for a code',
      new KycApiError(
        412,
        'Not waiting for a code',
        'session_not_in_email_verification',
      ),
    ],
    ['a network failure', new Error('network down')],
  ])('leaves the A2T in place for %s', async (_name, failure) => {
    const action = jest.fn().mockRejectedValue(failure);

    await expect(runKalshiSignedAction(action)).rejects.toBe(failure);

    expect(action).toHaveBeenCalledTimes(1);
    expect(mockCall).not.toHaveBeenCalledWith('PredictDeviceAuthService:clear');
  });

  it('refuses to sign when the device key is missing', async () => {
    mockCall.mockImplementation((action: string) => {
      if (action === 'PredictDeviceAuthService:getA2t') {
        return Promise.resolve('a2t-token');
      }
      return Promise.resolve(null);
    });
    const signer = createKalshiVendorRequestSigner();

    await expect(
      signer({
        vendor: 'kalshi',
        requests: [{ operation: 'enrollment/intents' }],
      }),
    ).rejects.toThrow('device signing is unavailable');
    expect(mockSignOnboardingRequest).not.toHaveBeenCalled();
  });
});
