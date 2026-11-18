import { createKalshiVendorRequestSigner } from './kalshiVendorRequestSigner';

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
