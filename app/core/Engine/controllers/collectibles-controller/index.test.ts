import { MOCK_ANY_NAMESPACE, type MockAnyNamespace } from '@metamask/messenger';

import {
  CollectiblesController,
  getDefaultCollectiblesControllerState,
  type CollectiblesControllerMessenger,
} from '../../../../components/UI/Collectibles/controllers/CollectiblesController';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import type { MessengerClientInitRequest } from '../../types';
import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import { collectiblesControllerInit } from '.';

jest.mock(
  '../../../../components/UI/Collectibles/controllers/CollectiblesController',
);

describe('collectiblesControllerInit', () => {
  const controllerClassMock = jest.mocked(CollectiblesController);
  let initRequestMock: jest.Mocked<
    MessengerClientInitRequest<CollectiblesControllerMessenger>
  >;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(getDefaultCollectiblesControllerState).mockReturnValue({});
    initRequestMock = buildMessengerClientInitRequestMock(
      new ExtendedMessenger<MockAnyNamespace>({
        namespace: MOCK_ANY_NAMESPACE,
      }),
    );
  });

  it('returns the controller instance', () => {
    const { controller } = collectiblesControllerInit(initRequestMock);

    expect(controller).toBeInstanceOf(CollectiblesController);
  });

  it('passes the controller messenger and default state on first initialization', () => {
    delete initRequestMock.persistedState.CollectiblesController;

    collectiblesControllerInit(initRequestMock);

    expect(controllerClassMock).toHaveBeenCalledWith({
      messenger: initRequestMock.controllerMessenger,
      state: {},
    });
  });

  it('passes the persisted controller state to the constructor', () => {
    const state = {};
    initRequestMock.persistedState.CollectiblesController = state;

    collectiblesControllerInit(initRequestMock);

    expect(controllerClassMock.mock.calls[0][0].state).toBe(state);
  });
});
