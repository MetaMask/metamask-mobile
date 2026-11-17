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

jest.mock(
  '../Engine/controllers/mfa-recovery-controller/services/mfa-recovery-service',
  () => ({
    MfaRecoveryService: jest.fn(),
  }),
);

import { MfaRecoveryService } from '../Engine/controllers/mfa-recovery-controller/services/mfa-recovery-service';
import { getMfaRecoveryServiceMessenger } from '../Engine/messengers/mfa-recovery-controller-messenger';
import {
  canProveSocialIdentifier,
  createMfaRecoveryService,
  createPasswordlessRecoveryService,
} from './engineBindings';
import { PASSWORDLESS_RECOVERY_OPERATION } from './passwordlessSocialRecovery';

describe('canProveSocialIdentifier', () => {
  it('allows Google on iOS and Android', () => {
    expect(canProveSocialIdentifier('ios', 'google')).toBe(true);
    expect(canProveSocialIdentifier('android', 'google')).toBe(true);
  });

  it('rejects Google on an unsupported platform', () => {
    expect(canProveSocialIdentifier('web', 'google')).toBe(false);
  });

  it('allows Apple on iOS only', () => {
    expect(canProveSocialIdentifier('ios', 'apple')).toBe(true);
    expect(canProveSocialIdentifier('android', 'apple')).toBe(false);
  });

  it('rejects Telegram and a missing provider', () => {
    expect(canProveSocialIdentifier('ios', 'telegram')).toBe(false);
    expect(canProveSocialIdentifier('ios', undefined)).toBe(false);
    expect(canProveSocialIdentifier('android', undefined)).toBe(false);
  });
});

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

describe('createPasswordlessRecoveryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds the service for the passwordless recovery operation', () => {
    const service = createPasswordlessRecoveryService();

    expect(service).toBeInstanceOf(MfaRecoveryService);
    expect(MfaRecoveryService).toHaveBeenCalledWith(
      expect.objectContaining({
        verifyMfa: expect.any(Function),
        approvalOperation: PASSWORDLESS_RECOVERY_OPERATION,
      }),
    );
  });

  it('gives the service a verification that does not prompt', async () => {
    createPasswordlessRecoveryService();
    const [{ verifyMfa }] = jest.mocked(MfaRecoveryService).mock.calls[0];

    await expect(verifyMfa()).resolves.toBeUndefined();
  });
});
