import type { KeyringControllerUnlockEvent } from '@metamask/keyring-controller';
import { MOCK_ANY_NAMESPACE, type MockAnyNamespace } from '@metamask/messenger';

import {
  CollectiblesController,
  type CollectiblesControllerMessenger,
  type CollectiblesControllerState,
} from '../../../../components/UI/Collectibles/controllers/CollectiblesController';
import {
  createPackPartnerApi,
  type PackPartnerApi,
} from '../../../../components/UI/Collectibles/services/clients/PackPartnerApiClient';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import type { MessengerClientInitRequest } from '../../types';
import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import { collectiblesControllerInit } from '.';

jest.mock(
  '../../../../components/UI/Collectibles/controllers/CollectiblesController',
  () => {
    const actual = jest.requireActual(
      '../../../../components/UI/Collectibles/controllers/CollectiblesController',
    );
    return {
      getDefaultCollectiblesControllerState:
        actual.getDefaultCollectiblesControllerState,
      CollectiblesController: jest.fn(),
    };
  },
);

jest.mock(
  '../../../../components/UI/Collectibles/services/clients/PackPartnerApiClient',
  () => ({
    ...jest.requireActual(
      '../../../../components/UI/Collectibles/services/clients/PackPartnerApiClient',
    ),
    createPackPartnerApi: jest.fn(),
  }),
);

type ActualPackPartnerApiModule =
  typeof import('../../../../components/UI/Collectibles/services/clients/PackPartnerApiClient');

const ADDRESS = '78ieXfmDY4ZG2t6PzY183YjpmpJkmzThgZHV6ZVxyare';
const MEMO = 'cc-7582548c-cf8c-42cb-b18f-1a8d76749c8a';

const getDefaultState = (): CollectiblesControllerState =>
  jest
    .requireActual(
      '../../../../components/UI/Collectibles/controllers/CollectiblesController',
    )
    .getDefaultCollectiblesControllerState();

const buildPersistedState = (): CollectiblesControllerState => ({
  ...getDefaultState(),
  hasCompletedOnboarding: true,
  packPartner: {
    operations: {
      [ADDRESS]: {
        [MEMO]: {
          memo: MEMO,
          packCode: 'pokemon_50',
          packName: 'Pokemon 50',
          price: 50,
          priceAmount: '50000000',
          status: 'submitted',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      },
    },
    sales: {},
  },
});

describe('collectiblesControllerInit', () => {
  const controllerClassMock = jest.mocked(CollectiblesController);
  const createApiMock = jest.mocked(createPackPartnerApi);
  let rootMessenger: ExtendedMessenger<
    MockAnyNamespace,
    never,
    KeyringControllerUnlockEvent
  >;
  let initRequestMock: jest.Mocked<
    MessengerClientInitRequest<CollectiblesControllerMessenger>
  >;

  beforeEach(() => {
    jest.resetAllMocks();
    rootMessenger = new ExtendedMessenger({ namespace: MOCK_ANY_NAMESPACE });
    initRequestMock = buildMessengerClientInitRequestMock(rootMessenger);
  });

  it('returns the controller instance', () => {
    const { controller } = collectiblesControllerInit(initRequestMock);

    expect(controller).toBeInstanceOf(CollectiblesController);
  });

  it('passes the controller messenger', () => {
    collectiblesControllerInit(initRequestMock);

    expect(controllerClassMock.mock.calls[0][0].messenger).toBe(
      initRequestMock.controllerMessenger,
    );
  });

  it('uses the default state when nothing is persisted', () => {
    collectiblesControllerInit(initRequestMock);

    expect(controllerClassMock.mock.calls[0][0].state).toStrictEqual(
      getDefaultState(),
    );
  });

  it('uses the persisted state', () => {
    const persistedState = buildPersistedState();
    initRequestMock.persistedState = {
      ...initRequestMock.persistedState,
      CollectiblesController: persistedState,
    };

    collectiblesControllerInit(initRequestMock);

    expect(controllerClassMock.mock.calls[0][0].state).toStrictEqual(
      persistedState,
    );
  });

  it('creates the controller with its own uncached workflow API client', () => {
    const workflowApi = {} as PackPartnerApi;
    createApiMock.mockReturnValue(workflowApi);

    collectiblesControllerInit(initRequestMock);

    const [params] = controllerClassMock.mock.calls[0];
    expect(Object.keys(params).sort()).toStrictEqual([
      'messenger',
      'packPartner',
      'state',
    ]);
    expect(createApiMock).toHaveBeenCalledTimes(1);
    expect(createApiMock).toHaveBeenCalledWith();
    expect(params.packPartner).toStrictEqual({ api: workflowApi });
  });

  describe('with the real controller', () => {
    const originalFetch = globalThis.fetch;
    let fetchMock: jest.MockedFunction<typeof fetch>;

    beforeEach(() => {
      const { CollectiblesController: ActualCollectiblesController } =
        jest.requireActual<
          typeof import('../../../../components/UI/Collectibles/controllers/CollectiblesController')
        >(
          '../../../../components/UI/Collectibles/controllers/CollectiblesController',
        );
      const { createPackPartnerApi: actualCreatePackPartnerApi } =
        jest.requireActual<ActualPackPartnerApiModule>(
          '../../../../components/UI/Collectibles/services/clients/PackPartnerApiClient',
        );
      controllerClassMock.mockImplementation(
        (options) => new ActualCollectiblesController(options),
      );
      createApiMock.mockImplementation(actualCreatePackPartnerApi);
      fetchMock = jest
        .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
        .mockRejectedValue(new TypeError('Network request failed'));
      globalThis.fetch = fetchMock;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('makes no network call at init', () => {
      const { controller } = collectiblesControllerInit(initRequestMock);

      expect(controller.state).toStrictEqual(getDefaultState());
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
