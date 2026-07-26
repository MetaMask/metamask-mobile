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
  type CardFeatureFlag,
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

let capturedGetCardFeatureFlag:
  | (() => CardFeatureFlag | null | undefined)
  | undefined;

jest.mock('./providers/ImmersveProvider', () => {
  const actual = jest.requireActual('./providers/ImmersveProvider');
  return {
    ...actual,
    ImmersveProvider: jest.fn((args: unknown) => {
      const { getCardFeatureFlag } = args as {
        getCardFeatureFlag?: () => CardFeatureFlag | null | undefined;
      };
      capturedGetCardFeatureFlag = getCardFeatureFlag;
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
    capturedGetCardFeatureFlag = undefined;

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

  describe('getCardFeatureFlag cardProgramId overlay', () => {
    it('overlays selectedCardProgramId onto immersve.cardProgramId', () => {
      getRemoteFeatureFlags.mockReturnValue({
        remoteFeatureFlags: {
          cardFeature: {
            ...defaultCardFeatureFlag,
            immersve: {
              ...defaultCardFeatureFlag.immersve,
              cardProgramId: 'default-program',
            },
          },
        },
      });

      const { controller } = cardControllerInit(initRequestMock);

      expect(immersveProviderClassMock).toHaveBeenCalled();
      expect(capturedGetCardFeatureFlag).toBeDefined();
      expect(capturedGetCardFeatureFlag?.()?.immersve?.cardProgramId).toBe(
        'default-program',
      );

      controller.setSelectedCardProgramId('override-program');

      expect(capturedGetCardFeatureFlag?.()?.immersve?.cardProgramId).toBe(
        'override-program',
      );
    });

    it('does not overlay when selectedCardProgramId is null', () => {
      getRemoteFeatureFlags.mockReturnValue({
        remoteFeatureFlags: {
          cardFeature: {
            ...defaultCardFeatureFlag,
            immersve: {
              ...defaultCardFeatureFlag.immersve,
              cardProgramId: 'default-program',
            },
          },
        },
      });

      cardControllerInit(initRequestMock);

      expect(capturedGetCardFeatureFlag?.()?.immersve?.cardProgramId).toBe(
        'default-program',
      );
    });
  });
});
