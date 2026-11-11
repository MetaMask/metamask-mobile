import Engine from '../../../../../core/Engine';
import packageJSON from '../../../../../../package.json';
import {
  KalshiOnboardingClient,
  type KalshiOnboardingClientOptions,
} from '../../adapters/remote/KalshiOnboardingClient';
import { createP256DeviceKey } from '../../auth/p256DeviceKey';
import { KALSHI_AUTHENTICATION_PROFILE } from '../../auth/venueAuthProfiles';
import { createKalshiOnboardingClient } from './createKalshiOnboardingClient';

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      AuthenticationController: {
        getBearerToken: jest.fn(),
      },
    },
    controllerMessenger: {
      call: jest.fn(),
    },
  },
}));

jest.mock('../../adapters/remote/KalshiOnboardingClient', () => ({
  KalshiOnboardingClient: jest.fn(),
}));

jest.mock('../../auth/p256DeviceKey', () => ({
  createP256DeviceKey: jest.fn(),
}));

const getBearerToken = Engine.context.AuthenticationController
  .getBearerToken as jest.Mock;
const messengerCall = Engine.controllerMessenger.call as jest.Mock;
const MockClient = KalshiOnboardingClient as unknown as jest.Mock;

describe('createKalshiOnboardingClient', () => {
  const sign = jest.fn(async (message: Uint8Array) => message);

  beforeEach(() => {
    MockClient.mockClear();
    getBearerToken.mockResolvedValue('mm-token');
    messengerCall.mockImplementation(async (method: string) => {
      if (method === 'PredictDeviceAuthService:getA2t') {
        return 'a2t-token';
      }
      if (method === 'PredictDeviceAuthService:ensureDeviceKey') {
        return { publicKey: 'device-key', salt: 'device-salt' };
      }
      return undefined;
    });
    jest.mocked(createP256DeviceKey).mockReturnValue({
      sign,
    } as unknown as ReturnType<typeof createP256DeviceKey>);
  });

  it('wires the predict API, the bearer and the device key into the client', async () => {
    createKalshiOnboardingClient();
    const options = MockClient.mock
      .calls[0][0] as KalshiOnboardingClientOptions;
    const message = new Uint8Array([1, 2, 3]);

    await expect(options.getBearerToken()).resolves.toBe('mm-token');
    await expect(options.getA2t()).resolves.toBe('a2t-token');
    await expect(options.getDeviceKey()).resolves.toEqual({
      publicKey: 'device-key',
      salt: 'device-salt',
    });
    await expect(options.signDeviceProof(message)).resolves.toBe(message);
    options.invalidateA2t();

    // Babel inlines `process.env.MM_PREDICT_API_URL` in the factory, so the
    // expected value is that same expression, not a runtime assignment.
    expect(options.baseUrl).toBe(process.env.MM_PREDICT_API_URL);
    expect(options.clientVersion).toBe(packageJSON.version);
    expect(getBearerToken).toHaveBeenCalledTimes(1);
    expect(messengerCall).toHaveBeenCalledWith(
      'PredictDeviceAuthService:getA2t',
    );
    expect(messengerCall).toHaveBeenCalledWith(
      'PredictDeviceAuthService:ensureDeviceKey',
    );
    expect(messengerCall).toHaveBeenCalledWith(
      'PredictDeviceAuthService:clear',
    );
    expect(createP256DeviceKey).toHaveBeenCalledWith(
      KALSHI_AUTHENTICATION_PROFILE.deviceKey,
    );
    expect(sign).toHaveBeenCalledWith(message);
  });
});
