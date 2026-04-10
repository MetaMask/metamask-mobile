import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { getComplianceServiceMessenger } from '../../messengers/compliance/compliance-service-messenger';
import { complianceServiceInit } from './compliance-service-init';
import {
  ComplianceService,
  type ComplianceServiceMessenger,
} from '@metamask/compliance-controller';
import { MessengerClientInitRequest } from '../../types';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('../../../../util/environment', () => ({
  isProduction: jest.fn(),
}));

import { isProduction } from '../../../../util/environment';

const mockIsProduction = isProduction as jest.MockedFunction<
  typeof isProduction
>;

function getInitRequestMock(): jest.Mocked<
  MessengerClientInitRequest<ComplianceServiceMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  return {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getComplianceServiceMessenger(baseMessenger),
  };
}

describe('complianceServiceInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('instantiates the ComplianceService', () => {
    mockIsProduction.mockReturnValue(false);
    const { messengerClient } = complianceServiceInit(getInitRequestMock());
    expect(messengerClient).toBeInstanceOf(ComplianceService);
  });

  it('passes env=production when isProduction() returns true', () => {
    mockIsProduction.mockReturnValue(true);
    complianceServiceInit(getInitRequestMock());
    expect(mockIsProduction).toHaveReturnedWith(true);
  });

  it('passes env=development when isProduction() returns false', () => {
    mockIsProduction.mockReturnValue(false);
    complianceServiceInit(getInitRequestMock());
    expect(mockIsProduction).toHaveReturnedWith(false);
  });
});
