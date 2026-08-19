import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import {
  getTokensControllerMessenger,
  getTokensControllerInitMessenger,
  TokensControllerInitMessenger,
} from '../messengers/tokens-controller-messenger';
import { MessengerClientInitRequest } from '../types';
import { tokensControllerInit } from './tokens-controller-init';
import {
  TokensController,
  TokensControllerMessenger,
} from '@metamask/assets-controllers';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { selectIsControllerDeprecated } from '../../../selectors/featureFlagController/assetsUnifyState';

jest.mock('@metamask/assets-controllers');

jest.mock('../../../selectors/featureFlagController/assetsUnifyState', () => ({
  selectIsControllerDeprecated: jest
    .fn()
    .mockReturnValue(jest.fn().mockReturnValue(false)),
}));

jest.mock('../../../store', () => ({
  store: { getState: jest.fn().mockReturnValue({}) },
}));

function getInitRequestMock(): jest.Mocked<
  MessengerClientInitRequest<
    TokensControllerMessenger,
    TokensControllerInitMessenger
  >
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const requestMock = {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getTokensControllerMessenger(baseMessenger),
    initMessenger: getTokensControllerInitMessenger(baseMessenger),
  };

  baseMessenger.registerActionHandler(
    // @ts-expect-error: Partial mock.
    'NetworkController:getSelectedNetworkClient',
    () => ({
      provider: {},
    }),
  );

  // @ts-expect-error: Partial mock.
  requestMock.getMessengerClient.mockImplementation((name) => {
    if (name === 'NetworkController') {
      return {
        state: {
          selectedNetworkClientId: 'mainnet',
        },

        getNetworkClientById: jest
          .fn()
          .mockImplementation((networkClientId) => {
            if (networkClientId === 'mainnet') {
              return {
                configuration: {
                  chainId: '0x1',
                },
              };
            }

            throw new Error(`Network client "${networkClientId}" not found.`);
          }),
      };
    }

    throw new Error(`Controller "${name}" not found.`);
  });

  return requestMock;
}

describe('tokensControllerInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('initializes the controller', () => {
    const { controller } = tokensControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(TokensController);
  });

  it('passes the proper arguments to the controller including isDeprecated', () => {
    tokensControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(TokensController);
    expect(controllerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messenger: expect.any(Object),
        state: undefined,
        chainId: '0x1',
        provider: {},
        tokenListService: expect.any(Object),
        isDeprecated: expect.any(Function),
      }),
    );
  });

  describe('isDeprecated', () => {
    it('returns false when TokensController is not deprecated', () => {
      jest
        .mocked(selectIsControllerDeprecated)
        .mockReturnValue(
          jest.fn().mockReturnValue(false) as unknown as ReturnType<
            typeof selectIsControllerDeprecated
          >,
        );

      tokensControllerInit(getInitRequestMock());

      const controllerMock = jest.mocked(TokensController);
      const { isDeprecated } = controllerMock.mock.calls[0][0] as {
        isDeprecated: () => boolean;
      };

      expect(isDeprecated()).toBe(false);
      expect(selectIsControllerDeprecated).toHaveBeenCalledWith(
        'TokensController',
      );
    });

    it('returns true when TokensController is deprecated', () => {
      jest
        .mocked(selectIsControllerDeprecated)
        .mockReturnValue(
          jest.fn().mockReturnValue(true) as unknown as ReturnType<
            typeof selectIsControllerDeprecated
          >,
        );

      tokensControllerInit(getInitRequestMock());

      const controllerMock = jest.mocked(TokensController);
      const { isDeprecated } = controllerMock.mock.calls[0][0] as {
        isDeprecated: () => boolean;
      };

      expect(isDeprecated()).toBe(true);
    });
  });
});
