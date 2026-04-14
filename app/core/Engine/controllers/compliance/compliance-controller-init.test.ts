import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import {
  getComplianceControllerMessenger,
  getComplianceControllerInitMessenger,
  ComplianceControllerInitMessenger,
} from '../../messengers/compliance/compliance-controller-messenger';
import { ControllerInitRequest } from '../../types';
import { complianceControllerInit } from './compliance-controller-init';
import {
  ComplianceController,
  type ComplianceControllerMessenger,
} from '@metamask/compliance-controller';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('99.0.0'),
}));

function buildComplianceFlag(enabled: boolean) {
  return { enabled, minimumVersion: '0.0.0' };
}

function getInitRequestMock(
  overrides: {
    complianceEnabled?: boolean;
    persistedState?: Record<string, unknown>;
  } = {},
): jest.Mocked<
  ControllerInitRequest<
    ComplianceControllerMessenger,
    ComplianceControllerInitMessenger
  >
> {
  const { complianceEnabled = false, persistedState = {} } = overrides;

  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  baseMessenger.registerActionHandler(
    // @ts-expect-error: Partial mock for feature flag state
    'RemoteFeatureFlagController:getState',
    () => ({
      remoteFeatureFlags: {
        complianceEnabled: buildComplianceFlag(complianceEnabled),
      },
    }),
  );

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getComplianceControllerMessenger(baseMessenger),
    initMessenger: getComplianceControllerInitMessenger(baseMessenger),
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

  it('calls init() when complianceEnabled feature flag is true', () => {
    const initSpy = jest
      .spyOn(ComplianceController.prototype, 'init')
      .mockResolvedValue(undefined);

    complianceControllerInit(getInitRequestMock({ complianceEnabled: true }));

    expect(initSpy).toHaveBeenCalled();
    initSpy.mockRestore();
  });

  it('does not call init() when complianceEnabled feature flag is false', () => {
    const initSpy = jest
      .spyOn(ComplianceController.prototype, 'init')
      .mockResolvedValue(undefined);

    complianceControllerInit(getInitRequestMock({ complianceEnabled: false }));

    expect(initSpy).not.toHaveBeenCalled();
    initSpy.mockRestore();
  });
});
