import { CronjobController, GetAllSnaps } from '@metamask/snaps-controllers';
import { ControllerInitRequest } from '../../types';
import {
  CronjobControllerMessenger,
  getCronjobControllerMessenger,
} from '../../messengers/snaps';
import { cronjobControllerInit } from './cronjob-controller-init';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<CronjobControllerMessenger>
> {
  const baseMessenger = new ExtendedControllerMessenger<GetAllSnaps, never>();

  baseMessenger.registerActionHandler(
    'SnapController:getAll',
    jest.fn().mockReturnValue([]),
  );

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getCronjobControllerMessenger(baseMessenger),
    initMessenger: undefined,
  };

  return requestMock;
}

describe('CronjobControllerInit', () => {
  it('initializes the controller', () => {
    const { controller } = cronjobControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(CronjobController);
  });
});
