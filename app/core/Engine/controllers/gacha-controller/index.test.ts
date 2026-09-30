import { MOCK_ANY_NAMESPACE, type MockAnyNamespace } from '@metamask/messenger';

import {
  GachaController,
  type GachaControllerMessenger,
  type GachaControllerState,
} from '../../../../components/UI/Gacha/controllers/GachaController';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import type { MessengerClientInitRequest } from '../../types';
import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import { gachaControllerInit } from '.';

jest.mock('../../../../components/UI/Gacha/controllers/GachaController', () => {
  const actual = jest.requireActual(
    '../../../../components/UI/Gacha/controllers/GachaController',
  );
  return {
    getDefaultGachaControllerState: actual.getDefaultGachaControllerState,
    GachaController: jest.fn(),
  };
});

const getDefaultState = (): GachaControllerState =>
  jest
    .requireActual(
      '../../../../components/UI/Gacha/controllers/GachaController',
    )
    .getDefaultGachaControllerState();

describe('gachaControllerInit', () => {
  const controllerClassMock = jest.mocked(GachaController);
  let initRequestMock: jest.Mocked<
    MessengerClientInitRequest<GachaControllerMessenger>
  >;

  beforeEach(() => {
    jest.resetAllMocks();
    initRequestMock = buildMessengerClientInitRequestMock(
      new ExtendedMessenger<MockAnyNamespace>({
        namespace: MOCK_ANY_NAMESPACE,
      }),
    );
  });

  it('returns the controller instance', () => {
    const { controller } = gachaControllerInit(initRequestMock);

    expect(controller).toBeInstanceOf(GachaController);
  });

  it('passes the controller messenger', () => {
    gachaControllerInit(initRequestMock);

    expect(controllerClassMock.mock.calls[0][0].messenger).toBe(
      initRequestMock.controllerMessenger,
    );
  });

  it('uses the default state when nothing is persisted', () => {
    gachaControllerInit(initRequestMock);

    expect(controllerClassMock.mock.calls[0][0].state).toStrictEqual(
      getDefaultState(),
    );
  });

  it('uses the persisted state', () => {
    const persistedState: GachaControllerState = {
      collectorCrypt: {
        operations: {},
        cards: {
          '78ieXfmDY4ZG2t6PzY183YjpmpJkmzThgZHV6ZVxyare': {
            H4DUb7Y2RdDJjkeqSfwNGSQrPRRZeUnkidRKUMBNAfW1: {
              mint: 'H4DUb7Y2RdDJjkeqSfwNGSQrPRRZeUnkidRKUMBNAfW1',
              name: 'Card',
              source: 'nftApi',
              acquiredAt: 1,
              buyback: { status: 'unknown' },
            },
          },
        },
      },
    };
    initRequestMock.persistedState = {
      ...initRequestMock.persistedState,
      GachaController: persistedState,
    };

    gachaControllerInit(initRequestMock);

    expect(controllerClassMock.mock.calls[0][0].state).toStrictEqual(
      persistedState,
    );
  });

  it('makes no network call at init', () => {
    gachaControllerInit(initRequestMock);

    const [params] = controllerClassMock.mock.calls[0];
    expect(Object.keys(params).sort()).toStrictEqual(['messenger', 'state']);
  });
});
