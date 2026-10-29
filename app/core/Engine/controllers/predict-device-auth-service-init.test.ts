import { PredictDeviceAuthService } from '../../../components/UI/PredictNext/services/PredictDeviceAuthService';
import {
  predictDeviceAuthServiceInit,
  resolvePredictDeviceAuthIssuerUrl,
} from './predict-device-auth-service-init';

const mockClear = jest.fn();

jest.mock(
  '../../../components/UI/PredictNext/services/PredictDeviceAuthService',
  () => ({
    PredictDeviceAuthService: jest.fn().mockImplementation(() => ({
      clear: mockClear,
    })),
  }),
);

describe('predictDeviceAuthServiceInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const initialize = () => {
    const authentication = {
      isSignedIn: true,
      srpSessionData: {
        'entropy-source-id': {
          profile: { canonicalProfileId: 'canonical-profile-id' },
        },
      },
    };
    const featureFlags = {
      predictConfig: {
        enabled: true,
        venues: {
          kalshi: { enabled: true },
          polymarket: { enabled: false },
        },
        venueSelection: { enabled: false },
      },
    };
    const subscribers = new Map<string, (payload?: unknown) => void>();
    const subscribe = jest.fn(
      (event: string, callback: (payload?: unknown) => void) => {
        subscribers.set(event, callback);
      },
    );
    const call = jest.fn((type: string) => {
      if (type === 'AuthenticationController:getState') {
        return authentication;
      }
      if (type === 'AuthenticationController:getBearerToken') {
        return Promise.resolve('access-token');
      }
      if (type === 'AuthenticationController:getSessionProfile') {
        return Promise.resolve({
          canonicalProfileId:
            authentication.srpSessionData['entropy-source-id'].profile
              .canonicalProfileId,
        });
      }
      if (type === 'KeyringController:getState') {
        return {
          isUnlocked: true,
          keyrings: [
            {
              type: 'HD Key Tree',
              metadata: { id: 'entropy-source-id' },
            },
          ],
        };
      }
      if (type === 'RemoteFeatureFlagController:getState') {
        return { remoteFeatureFlags: featureFlags };
      }
      return undefined;
    });

    predictDeviceAuthServiceInit({
      controllerMessenger: {} as never,
      initMessenger: { call, subscribe } as never,
    } as never);

    return { authentication, featureFlags, subscribers, subscribe, call };
  };

  it('subscribes the service to credential-invalidating lifecycle events', () => {
    const { subscribe } = initialize();

    expect(PredictDeviceAuthService).toHaveBeenCalledTimes(1);
    expect(subscribe.mock.calls.map(([event]) => event)).toEqual([
      'KeyringController:lock',
      'AuthenticationController:stateChange',
      'AuthenticationController:profileSignIn',
      'RemoteFeatureFlagController:stateChange',
    ]);
  });

  it('reads signed-in state before completing service initialization', () => {
    const { call } = initialize();
    const firstAuthenticationRead = call.mock.invocationCallOrder.find(
      (_, index) =>
        call.mock.calls[index]?.[0] === 'AuthenticationController:getState',
    );
    const serviceConstruction = jest.mocked(PredictDeviceAuthService).mock
      .invocationCallOrder[0];

    expect(firstAuthenticationRead).toBeDefined();
    expect(firstAuthenticationRead as number).toBeLessThan(
      serviceConstruction as number,
    );
    expect(call).not.toHaveBeenCalledWith('KeyringController:getState');
    expect(call).not.toHaveBeenCalledWith(
      'AuthenticationController:getSessionProfile',
    );
  });

  it('clears credentials when Authentication signs out', () => {
    const { authentication, subscribers } = initialize();
    authentication.isSignedIn = false;

    subscribers.get('AuthenticationController:stateChange')?.();

    expect(mockClear).toHaveBeenCalledTimes(1);
  });

  it('clears credentials when the wallet locks', () => {
    const { subscribers } = initialize();

    subscribers.get('KeyringController:lock')?.();

    expect(mockClear).toHaveBeenCalledTimes(1);
  });

  it('keeps credentials when session data changes without a profile sign-in', () => {
    const { authentication, subscribers } = initialize();
    authentication.srpSessionData[
      'entropy-source-id'
    ].profile.canonicalProfileId = 'replacement-profile-id';

    subscribers.get('AuthenticationController:stateChange')?.();

    expect(mockClear).not.toHaveBeenCalled();
  });

  it('clears credentials when profile sign-in replaces the canonical profile', () => {
    const { subscribers } = initialize();

    subscribers.get('AuthenticationController:profileSignIn')?.({
      profileId: 'replacement-profile-id',
      profileAliases: [],
      profileIdChanged: true,
    });

    expect(mockClear).toHaveBeenCalledTimes(1);
  });

  it('keeps credentials when profile sign-in does not change the canonical profile', () => {
    const { subscribers } = initialize();

    subscribers.get('AuthenticationController:profileSignIn')?.({
      profileId: 'canonical-profile-id',
      profileAliases: [],
      profileIdChanged: false,
    });

    expect(mockClear).not.toHaveBeenCalled();
  });

  it('remembers the session profile id after the bearer token is read', async () => {
    const { call } = initialize();
    const deps = jest.mocked(PredictDeviceAuthService).mock.calls[0]?.[1] as {
      getAccessToken: () => Promise<string>;
      getCanonicalProfileId: () => string | undefined;
    };

    expect(deps.getCanonicalProfileId()).toBeUndefined();

    await expect(deps.getAccessToken()).resolves.toBe('access-token');

    expect(deps.getCanonicalProfileId()).toBe('canonical-profile-id');
    expect(call).toHaveBeenCalledWith(
      'AuthenticationController:getSessionProfile',
    );
  });

  it('clears credentials when Predict authentication is disabled', () => {
    const { featureFlags, subscribers } = initialize();
    featureFlags.predictConfig.enabled = false;

    subscribers.get('RemoteFeatureFlagController:stateChange')?.();

    expect(mockClear).toHaveBeenCalledTimes(1);
  });
});

describe('resolvePredictDeviceAuthIssuerUrl', () => {
  it('uses the development override only in development builds', () => {
    expect(
      resolvePredictDeviceAuthIssuerUrl(true, 'https://issuer.example'),
    ).toBe('https://issuer.example');
    expect(
      resolvePredictDeviceAuthIssuerUrl(false, 'https://issuer.example'),
    ).toBeUndefined();
  });

  it('uses the temporary issuer only in development builds', () => {
    expect(resolvePredictDeviceAuthIssuerUrl(true, undefined)).toBe(
      'https://predict-api.dev-api.cx.metamask.io',
    );
    expect(resolvePredictDeviceAuthIssuerUrl(false, undefined)).toBeUndefined();
  });
});
