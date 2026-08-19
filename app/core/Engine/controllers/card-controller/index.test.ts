import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import { MessengerClientInitRequest } from '../../types';
import { CardController, defaultCardControllerState } from './CardController';
import {
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

let capturedGetProgramConfig:
  | (() => ImmersveProgramConfig | null | undefined)
  | undefined;

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
});
