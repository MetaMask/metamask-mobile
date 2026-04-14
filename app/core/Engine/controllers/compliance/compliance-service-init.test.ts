import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { getComplianceServiceMessenger } from '../../messengers/compliance/compliance-service-messenger';
import { complianceServiceInit } from './compliance-service-init';
import {
  ComplianceService,
  type ComplianceServiceMessenger,
} from '@metamask/compliance-controller';
import { ControllerInitRequest } from '../../types';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<ComplianceServiceMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  return {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getComplianceServiceMessenger(baseMessenger),
  };
}

describe('complianceServiceInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('instantiates the ComplianceService', () => {
    const { controller } = complianceServiceInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(ComplianceService);
  });
});
