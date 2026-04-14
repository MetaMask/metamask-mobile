import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getSubjectMetadataControllerMessenger } from '../messengers/subject-metadata-controller-messenger';
import { ControllerInitRequest } from '../types';
import { subjectMetadataControllerInit } from './subject-metadata-controller-init';
import {
  SubjectMetadataController,
  SubjectMetadataControllerMessenger,
} from '@metamask/permission-controller';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/permission-controller');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<SubjectMetadataControllerMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

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
