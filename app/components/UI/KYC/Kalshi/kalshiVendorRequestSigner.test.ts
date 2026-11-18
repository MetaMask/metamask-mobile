import {
  createKalshiVendorRequestSigner,
  runKalshiSignedAction,
} from './kalshiVendorRequestSigner';

const mockSignOnboardingRequest = jest.fn();
const mockBuildEnvelope = jest.fn();

jest.mock('../../PredictNext/adapters/remote/kalshiOnboardingSigner', () => ({
  signOnboardingRequest: (...args: unknown[]) =>
    mockSignOnboardingRequest(...args),
  buildOnboardingVenueAuthorization: (...args: unknown[]) =>
    mockBuildEnvelope(...args),
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
    mockSignOnboardingRequest.mockResolvedValue({
      requestId: 'req',
      signatureInput: 'in',
      signature: 'sig',
    });
    mockBuildEnvelope.mockImplementation(
      ({ values }: { values: Record<string, string> }) =>
        `envelope:${values.idempotencyKey}`,
    );
  });

  it('signs the intent and the link, and does not send them', async () => {
    const signer = createKalshiVendorRequestSigner();

    const signed = await signer({
      vendor: 'kalshi',
      requests: [
        { operation: 'enrollment/intents' },
        { operation: 'users/link', email: '  a@b.co ' },
      ],
    });

    expect(signed).toStrictEqual([
      {
        operation: 'enrollment/intents',
        venueAuthorization: 'envelope:key-1',
      },
      { operation: 'users/link', venueAuthorization: 'envelope:key-2' },
    ]);
    expect(mockSignOnboardingRequest).toHaveBeenCalledTimes(2);
    expect(mockSignOnboardingRequest.mock.calls[1][0]).toMatchObject({
      path: '/trade-api/v2/isv/users/link',
      body: JSON.stringify({ email: 'a@b.co' }),
    });
    expect(mockCall).not.toHaveBeenCalledWith('PredictDeviceAuthService:clear');
  });

  it('signs the verification code', async () => {
    const signer = createKalshiVendorRequestSigner();

    const signed = await signer({
      vendor: 'kalshi',
      requests: [{ operation: 'users/link/verify', code: ' 888888 ' }],
    });

    expect(signed[0]?.operation).toBe('users/link/verify');
    expect(mockSignOnboardingRequest.mock.calls[0][0]).toMatchObject({
      path: '/trade-api/v2/isv/users/link/verify',
      body: JSON.stringify({ code: '888888' }),
    });
  });

  it('drops a rejected A2T and runs the signed call once more', async () => {
    const rejected = Object.assign(new Error('Kalshi refused'), {
      code: 'venue_authorization_invalid',
    });
    const action = jest
      .fn()
      .mockRejectedValueOnce(rejected)
      .mockResolvedValueOnce('signed');

    await expect(runKalshiSignedAction(action)).resolves.toBe('signed');

    expect(action).toHaveBeenCalledTimes(2);
    expect(mockCall).toHaveBeenCalledWith('PredictDeviceAuthService:clear');
  });

  it('does not sign a third time when the fresh A2T is also rejected', async () => {
    const rejected = new Error(
      "Fetching '/sessions' failed with status '403': venue_authorization_invalid",
    );
    const action = jest.fn().mockRejectedValue(rejected);

    await expect(runKalshiSignedAction(action)).rejects.toBe(rejected);

    expect(action).toHaveBeenCalledTimes(2);
    expect(mockCall).toHaveBeenCalledTimes(1);
  });

  it('leaves the A2T in place for any other failure', async () => {
    const rejected = Object.assign(new Error('Kalshi refused'), {
      status: 409,
      code: 'onboarding_conflict',
    });
    const action = jest.fn().mockRejectedValue(rejected);

    await expect(runKalshiSignedAction(action)).rejects.toBe(rejected);

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
