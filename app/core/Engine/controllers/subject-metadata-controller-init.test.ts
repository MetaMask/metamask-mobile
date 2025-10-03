import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedControllerMessenger } from '../../ExtendedControllerMessenger';
import {
  getSubjectMetadataControllerMessenger,
  type SubjectMetadataControllerMessenger,
} from '../messengers/subject-metadata-controller-messenger';
import { ControllerInitRequest } from '../types';
import { subjectMetadataControllerInit } from './subject-metadata-controller-init';
import { SubjectMetadataController } from '@metamask/permission-controller';

jest.mock('@metamask/permission-controller');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<SubjectMetadataControllerMessenger>
> {
  const baseMessenger = new ExtendedControllerMessenger<never, never>();

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getSubjectMetadataControllerMessenger(baseMessenger),
    initMessenger: undefined,
  };

  return requestMock;
}

describe('SubjectMetadataControllerInit', () => {
  it('initializes the controller', () => {
    const { controller } = subjectMetadataControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(SubjectMetadataController);
  });

  it('passes the proper arguments to the controller', () => {
    subjectMetadataControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(SubjectMetadataController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: {},
      subjectCacheLimit: 100,
    });
  });
});
