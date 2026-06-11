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
jest.mock('@metamask/compliance-controller');

import { isProduction } from '../../../../util/environment';

const COMPLIANCE_API_URL = 'https://compliance.example.com';

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
  const originalComplianceApiUrl = process.env.COMPLIANCE_API_URL;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.COMPLIANCE_API_URL = COMPLIANCE_API_URL;
  });

  afterEach(() => {
    process.env.COMPLIANCE_API_URL = originalComplianceApiUrl;
  });

  it('instantiates the ComplianceService', () => {
    mockIsProduction.mockReturnValue(false);
    const { controller } = complianceServiceInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(ComplianceService);
  });

  it('passes production env and configured API URL when isProduction() returns true', () => {
    mockIsProduction.mockReturnValue(true);
    const requestMock = getInitRequestMock();

    const { controller } = complianceServiceInit(requestMock);

    expect(controller).toMatchObject({
      messenger: requestMock.controllerMessenger,
      fetch,
      env: 'production',
      apiUrl: COMPLIANCE_API_URL,
    });
  });

  it('passes development env and configured API URL when isProduction() returns false', () => {
    mockIsProduction.mockReturnValue(false);
    const requestMock = getInitRequestMock();

    const { controller } = complianceServiceInit(requestMock);

    expect(controller).toMatchObject({
      messenger: requestMock.controllerMessenger,
      fetch,
      env: 'development',
      apiUrl: COMPLIANCE_API_URL,
    });
  });
});
