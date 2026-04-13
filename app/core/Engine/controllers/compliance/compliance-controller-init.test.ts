import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { getComplianceControllerMessenger } from '../../messengers/compliance/compliance-controller-messenger';
import { MessengerClientInitRequest } from '../../types';
import { complianceControllerInit } from './compliance-controller-init';
import {
  ComplianceController,
  type ComplianceControllerMessenger,
} from '@metamask/compliance-controller';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

function getInitRequestMock(
  overrides: {
    persistedState?: Record<string, unknown>;
  } = {},
): jest.Mocked<MessengerClientInitRequest<ComplianceControllerMessenger>> {
  const { persistedState = {} } = overrides;

  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getComplianceControllerMessenger(baseMessenger),
    persistedState,
  };

  return requestMock;
}

describe('complianceControllerInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('instantiates the ComplianceController', () => {
    const { controller } = complianceControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(ComplianceController);
  });

  it('hydrates state from persistedState', () => {
    const persistedState = {
      ComplianceController: {
        walletComplianceStatusMap: {
          '0xABC': {
            address: '0xABC',
            blocked: true,
            checkedAt: '2025-01-01T00:00:00Z',
          },
        },
        lastCheckedAt: '2025-01-01T00:00:00Z',
      },
    };

    const { controller } = complianceControllerInit(
      getInitRequestMock({ persistedState }),
    );

    expect(controller).toBeInstanceOf(ComplianceController);
  });
});
