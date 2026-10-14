import type { VbaOnboardingSnapshot } from '@metamask/ramps-controller';
import {
  applyVbaDevOverrides,
  getVbaKycStatusOverride,
} from './vbaDevOverrides';
import { readVbaKycStatusOverrideEnv } from './vbaDevOverrides.env';

jest.mock('./vbaDevOverrides.env', () => ({
  readVbaKycStatusOverrideEnv: jest.fn(),
}));

const mockReadEnv = jest.mocked(readVbaKycStatusOverrideEnv);

const baseSnapshot: VbaOnboardingSnapshot = {
  sessionExists: true,
  vendorDisclaimersComplete: true,
  sessionDisclaimersComplete: true,
  providerFlowStatus: 'submitted',
  kycStatus: 'pending',
  autorampStatus: 'not_ready',
};

describe('vbaDevOverrides', () => {
  const devGlobal = globalThis as { __DEV__?: boolean };
  const originalDev = devGlobal.__DEV__;

  beforeEach(() => {
    jest.clearAllMocks();
    devGlobal.__DEV__ = true;
    mockReadEnv.mockReturnValue(undefined);
  });

  afterAll(() => {
    devGlobal.__DEV__ = originalDev;
  });

  it('returns null when the env var is unset', () => {
    expect(getVbaKycStatusOverride()).toBeNull();
    expect(applyVbaDevOverrides(baseSnapshot)).toBe(baseSnapshot);
  });

  it('returns null for a value that is not a KYC status', () => {
    mockReadEnv.mockReturnValue('banana');

    expect(getVbaKycStatusOverride()).toBeNull();
  });

  it('forces the KYC status and completes the session when set to rejected', () => {
    mockReadEnv.mockReturnValue('rejected');

    expect(
      applyVbaDevOverrides({
        ...baseSnapshot,
        sessionExists: false,
        sessionDisclaimersComplete: false,
      }),
    ).toStrictEqual({
      ...baseSnapshot,
      kycStatus: 'rejected',
    });
  });

  it('ignores the env var outside dev builds', () => {
    devGlobal.__DEV__ = false;
    mockReadEnv.mockReturnValue('rejected');

    expect(getVbaKycStatusOverride()).toBeNull();
    expect(applyVbaDevOverrides(baseSnapshot)).toBe(baseSnapshot);
  });
});
