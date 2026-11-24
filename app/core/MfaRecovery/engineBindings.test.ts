const mockEngine: { controllerMessenger: unknown } = {
  controllerMessenger: { name: 'root-1' },
};

jest.mock('../Engine', () => ({
  __esModule: true,
  get default() {
    return mockEngine;
  },
}));

jest.mock('../Engine/messengers/mfa-recovery-controller-messenger', () => ({
  getMfaRecoveryServiceMessenger: jest.fn((root: unknown) => ({
    serviceMessengerFor: root,
  })),
}));

jest.mock('./services/mfa-recovery-service', () => ({
  MfaRecoveryService: jest.fn(),
}));

import { MfaRecoveryService } from './services/mfa-recovery-service';
import { getMfaRecoveryServiceMessenger } from '../Engine/messengers/mfa-recovery-controller-messenger';
import { createMfaRecoveryService } from './engineBindings';

describe('createMfaRecoveryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("builds the service with the run's options and the Engine messenger", () => {
    const verifyMfa = jest.fn();

    const service = createMfaRecoveryService({
      verifyMfa,
      approvalOperation: 'test.operation',
    });

    expect(service).toBeInstanceOf(MfaRecoveryService);
    expect(MfaRecoveryService).toHaveBeenCalledWith({
      verifyMfa,
      approvalOperation: 'test.operation',
      messenger: { serviceMessengerFor: mockEngine.controllerMessenger },
    });
  });

  it('reuses the service messenger while the Engine messenger is the same', () => {
    mockEngine.controllerMessenger = { name: 'root-reuse' };
    const options = { verifyMfa: jest.fn(), approvalOperation: 'test' };

    createMfaRecoveryService(options);
    createMfaRecoveryService(options);

    const [first, second] = jest
      .mocked(MfaRecoveryService)
      .mock.calls.map(([callOptions]) => callOptions.messenger);
    expect(second).toBe(first);
    expect(getMfaRecoveryServiceMessenger).toHaveBeenCalledTimes(1);
  });

  it('builds a new service messenger when the Engine messenger changes', () => {
    const options = { verifyMfa: jest.fn(), approvalOperation: 'test' };
    mockEngine.controllerMessenger = { name: 'root-a' };
    createMfaRecoveryService(options);
    mockEngine.controllerMessenger = { name: 'root-b' };
    createMfaRecoveryService(options);

    expect(getMfaRecoveryServiceMessenger).toHaveBeenCalledTimes(2);
    expect(getMfaRecoveryServiceMessenger).toHaveBeenLastCalledWith(
      mockEngine.controllerMessenger,
    );
  });
});
