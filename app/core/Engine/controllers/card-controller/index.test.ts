import { Platform } from 'react-native';
import QuickCrypto from 'react-native-quick-crypto';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import { MessengerClientInitRequest } from '../../types';
import type { RootState } from '../../../../reducers';
import { CardController, defaultCardControllerState } from './CardController';
import {
  type CardClientInfo,
  type CardControllerMessenger,
  type CardControllerState,
} from './types';
import { cardControllerInit } from '.';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { ImmersveProvider } from './providers/ImmersveProvider';
import {
  defaultCardFeatureFlag,
  type ImmersveProgramConfig,
} from '../../../../selectors/featureFlagController/card';

jest.mock('./CardController', () => {
  const actual = jest.requireActual('./CardController');
  return {
    ...actual,
    CardController: jest.fn((...args: unknown[]) => {
      const Actual = actual.CardController;
      return new Actual(...args);
    }),
  };
});

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '7.61.0'),
  getBuildNumber: jest.fn(() => '1600'),
}));

let capturedGetProgramConfig:
  | (() => ImmersveProgramConfig | null | undefined)
  | undefined;
let capturedGetClientInfo: (() => CardClientInfo) | undefined;

jest.mock('./services/CardService', () => {
  const actual = jest.requireActual('./services/CardService');
  return {
    ...actual,
    CardService: jest.fn((args: { getClientInfo: () => CardClientInfo }) => {
      capturedGetClientInfo = args.getClientInfo;
      return new actual.CardService(args);
    }),
  };
});

jest.mock('./providers/ImmersveProvider', () => {
  const actual = jest.requireActual('./providers/ImmersveProvider');
  return {
    ...actual,
    ImmersveProvider: jest.fn((args: unknown) => {
      const { getProgramConfig } = args as {
        getProgramConfig?: () => ImmersveProgramConfig | null | undefined;
      };
      capturedGetProgramConfig = getProgramConfig;
      return new actual.ImmersveProvider(args);
    }),
  };
});

describe('cardControllerInit', () => {
  const cardControllerClassMock = jest.mocked(CardController);
  const immersveProviderClassMock = jest.mocked(ImmersveProvider);
  let initRequestMock: jest.Mocked<
    MessengerClientInitRequest<CardControllerMessenger>
  >;
  let getRemoteFeatureFlags: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedGetProgramConfig = undefined;
    capturedGetClientInfo = undefined;

    const baseControllerMessenger = new ExtendedMessenger<MockAnyNamespace>({
      namespace: MOCK_ANY_NAMESPACE,
    });

    getRemoteFeatureFlags = jest.fn().mockReturnValue({
      remoteFeatureFlags: {},
    });

    baseControllerMessenger.registerActionHandler(
      // @ts-expect-error: Action not allowed.
      'RemoteFeatureFlagController:getState',
      getRemoteFeatureFlags,
    );

    initRequestMock = buildMessengerClientInitRequestMock(
      baseControllerMessenger,
    );
  });

  it('returns a controller instance', () => {
    const result = cardControllerInit(initRequestMock);

    expect(result.controller).toBeInstanceOf(
      jest.requireActual('./CardController').CardController,
    );
  });

  it('uses default state when no persisted state is provided', () => {
    initRequestMock.persistedState = {};

    cardControllerInit(initRequestMock);

    const constructorArgs = cardControllerClassMock.mock.calls[0][0];
    expect(constructorArgs.state).toStrictEqual(defaultCardControllerState);
  });

  it('uses persisted state when provided', () => {
    const persistedState: CardControllerState = {
      ...defaultCardControllerState,
      selectedCountry: 'US',
      activeProviderId: 'baanx',
      isAuthenticated: true,
      cardholderAccounts: ['eip155:1:0xabc'],
      providerData: { baanx: { location: 'us' } },
    };

    initRequestMock.persistedState = {
      ...initRequestMock.persistedState,
      CardController: persistedState,
    };

    cardControllerInit(initRequestMock);

    const constructorArgs = cardControllerClassMock.mock.calls[0][0];
    expect(constructorArgs.state).toStrictEqual(persistedState);
  });

  it('returns cardProgramId from the cardImmersveConfig flag', () => {
    getRemoteFeatureFlags.mockReturnValue({
      remoteFeatureFlags: {
        cardFeature: defaultCardFeatureFlag,
        cardImmersveConfig: { cardProgramId: 'flag-program' },
      },
    });

    cardControllerInit(initRequestMock);

    expect(immersveProviderClassMock).toHaveBeenCalled();
    expect(capturedGetProgramConfig).toBeDefined();
    expect(capturedGetProgramConfig?.()?.cardProgramId).toBe('flag-program');
  });

  it('ignores the legacy cardFeature.immersve block', () => {
    getRemoteFeatureFlags.mockReturnValue({
      remoteFeatureFlags: {
        cardFeature: {
          ...defaultCardFeatureFlag,
          immersve: { cardProgramId: 'legacy-program' },
        },
      },
    });

    cardControllerInit(initRequestMock);

    expect(capturedGetProgramConfig?.()?.cardProgramId).toBe('');
  });

  it('passes the mobile client info to CardService', () => {
    cardControllerInit(initRequestMock);

    expect(capturedGetClientInfo?.()).toStrictEqual({
      product: 'metamask-mobile',
      version: '7.61.0',
      build: '1600',
      platform: Platform.OS,
    });
  });

  it('hashes with QuickCrypto SHA-256', async () => {
    const digest = jest
      .fn()
      .mockResolvedValue(new Uint8Array([9, 8, 7]).buffer);
    (QuickCrypto.subtle as unknown as { digest: jest.Mock }).digest = digest;
    cardControllerInit(initRequestMock);
    const { sha256 } = cardControllerClassMock.mock.calls[0][0];

    await expect(sha256('abc')).resolves.toStrictEqual(
      new Uint8Array([9, 8, 7]),
    );
    expect(digest).toHaveBeenCalledWith(
      'SHA-256',
      new TextEncoder().encode('abc'),
    );
  });

  it('reads Basic Functionality from the redux state', () => {
    cardControllerInit(initRequestMock);
    const { isBasicFunctionalityEnabled } =
      cardControllerClassMock.mock.calls[0][0];

    initRequestMock.getState.mockReturnValue({
      settings: { basicFunctionalityEnabled: false },
    } as unknown as RootState);
    expect(isBasicFunctionalityEnabled()).toBe(false);

    initRequestMock.getState.mockReturnValue({
      settings: { basicFunctionalityEnabled: true },
    } as unknown as RootState);
    expect(isBasicFunctionalityEnabled()).toBe(true);
  });
});
