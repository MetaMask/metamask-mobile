import { DeviceManagementKitBuilder } from '@ledgerhq/device-management-kit';
import { getDmk, isDmkEnabled, resetDmk } from './dmk';
import { FeatureFlagNames } from '../../constants/featureFlags';
import { validatedVersionGatedFeatureFlag } from '../../util/remoteFeatureFlag';
import DevLogger from '../SDKConnect/utils/DevLogger';

jest.mock('../../util/remoteFeatureFlag', () => ({
  validatedVersionGatedFeatureFlag: jest.fn(),
}));

jest.mock('../SDKConnect/utils/DevLogger', () => ({
  __esModule: true,
  default: { log: jest.fn() },
}));

jest.mock('@ledgerhq/device-management-kit', () => {
  const mockBuild = jest.fn();
  const mockAddTransport = jest.fn().mockReturnThis();
  const DeviceManagementKitBuilderMock = jest.fn().mockImplementation(() => ({
    addTransport: mockAddTransport,
    build: mockBuild,
  }));

  return {
    DeviceManagementKitBuilder: DeviceManagementKitBuilderMock,
    __mockBuild: mockBuild,
    __mockAddTransport: mockAddTransport,
  };
});

jest.mock('@ledgerhq/device-transport-kit-react-native-ble', () => ({
  RNBleTransportFactory: 'RNBleTransportFactory',
}));

const mockVersionGated = validatedVersionGatedFeatureFlag as jest.Mock;
const MockDeviceManagementKitBuilder =
  DeviceManagementKitBuilder as unknown as jest.Mock;
const { __mockBuild: mockBuild, __mockAddTransport: mockAddTransport } =
  jest.requireMock('@ledgerhq/device-management-kit') as {
    __mockBuild: jest.Mock;
    __mockAddTransport: jest.Mock;
  };

describe('isDmkEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVersionGated.mockReturnValue(true);
  });

  it('returns true for an enabled version-gated flag', () => {
    expect(
      isDmkEnabled({
        [FeatureFlagNames.ledgerDmk]: {
          enabled: true,
          minimumVersion: '7.0.0',
        },
      }),
    ).toBe(true);
  });

  it('returns false when the flag is missing (default)', () => {
    expect(isDmkEnabled({})).toBe(false);
  });

  it('returns false when flags are omitted or null', () => {
    expect(isDmkEnabled()).toBe(false);
    expect(isDmkEnabled(null)).toBe(false);
    expect(isDmkEnabled(undefined)).toBe(false);
  });

  it('uses a boolean flag directly, bypassing version-gating', () => {
    expect(isDmkEnabled({ [FeatureFlagNames.ledgerDmk]: true })).toBe(true);
    expect(isDmkEnabled({ [FeatureFlagNames.ledgerDmk]: false })).toBe(false);
    expect(mockVersionGated).not.toHaveBeenCalled();
  });

  it('returns false when version-gated evaluation yields null', () => {
    mockVersionGated.mockReturnValue(null);

    expect(
      isDmkEnabled({
        [FeatureFlagNames.ledgerDmk]: {
          enabled: true,
          minimumVersion: '7.0.0',
        },
      }),
    ).toBe(false);
  });

  // LEDGER_FORCE_DMK is inlined by babel-plugin-transform-inline-environment-variables
  // at compile time, so its true branch cannot be exercised via runtime env mutation.
});

describe('getDmk', () => {
  const mockDmkInstance = { id: 'dmk-instance' };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAddTransport.mockReturnThis();
    mockBuild.mockReturnValue(mockDmkInstance);
    resetDmk();
  });

  afterEach(() => {
    resetDmk();
  });

  it('builds a DeviceManagementKit with the RN BLE transport on first call', () => {
    const dmk = getDmk();

    expect(MockDeviceManagementKitBuilder).toHaveBeenCalledTimes(1);
    expect(mockAddTransport).toHaveBeenCalledWith('RNBleTransportFactory');
    expect(mockBuild).toHaveBeenCalledTimes(1);
    expect(dmk).toBe(mockDmkInstance);
  });

  it('returns the cached DeviceManagementKit on subsequent calls', () => {
    const first = getDmk();
    const second = getDmk();

    expect(first).toBe(second);
    expect(MockDeviceManagementKitBuilder).toHaveBeenCalledTimes(1);
    expect(DevLogger.log).toHaveBeenCalledWith(
      '[DMK] Returning cached DeviceManagementKit instance',
    );
  });

  it('logs and rethrows when DeviceManagementKit construction fails', () => {
    const buildError = new Error('build failed');
    mockBuild.mockImplementation(() => {
      throw buildError;
    });

    expect(() => getDmk()).toThrow(buildError);
    expect(DevLogger.log).toHaveBeenCalledWith(
      '[DMK] Failed to build DeviceManagementKit:',
      buildError,
    );
  });

  it('builds a new instance after resetDmk clears the cache', () => {
    getDmk();
    resetDmk();

    const rebuilt = getDmk();

    expect(MockDeviceManagementKitBuilder).toHaveBeenCalledTimes(2);
    expect(rebuilt).toBe(mockDmkInstance);
  });
});
