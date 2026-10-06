import { MOCK_ANY_NAMESPACE, type MockAnyNamespace } from '@metamask/messenger';

import {
  GachaController,
  type GachaControllerMessenger,
} from '../../../../components/UI/Gacha/controllers/GachaController';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import type { MessengerClientInitRequest } from '../../types';
import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import { gachaControllerInit } from '.';

jest.mock('../../../../components/UI/Gacha/controllers/GachaController');

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

    expect(controllerClassMock).toHaveBeenCalledWith({
      messenger: initRequestMock.controllerMessenger,
    });
  });
});
