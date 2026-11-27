import type { RootState } from '../../../../reducers';
import {
  getKalshiBannerState,
  selectIsKalshiKycApproved,
} from './kalshiBannerState';

jest.mock('../../../../core/Engine', () => ({}));
jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { log: jest.fn(), error: jest.fn() },
}));

describe('getKalshiBannerState', () => {
  it.each([
    [undefined, undefined, 'getStarted'],
    ['terms', 'none', 'getStarted'],
    ['mfa', 'none', 'getStarted'],
    ['error', 'none', 'needMoreInfo'],
    ['kalshi_email_link', 'none', 'needMoreInfo'],
    ['kalshi_phone_link', 'none', 'needMoreInfo'],
    ['sumsub', 'none', 'needMoreInfo'],
    ['sumsub', 'retry', 'stepUp'],
    ['decision', 'pending', 'verifying'],
    ['decision', 'none', 'verifying'],
    ['decision', 'rejected', 'cantVerify'],
    ['decision', 'approved', 'verified'],
  ] as const)('maps step %s with status %s to %s', (step, status, expected) => {
    expect(getKalshiBannerState(step, status)).toBe(expected);
  });
});

describe('selectIsKalshiKycApproved', () => {
  const stateWith = (vendor: unknown) =>
    ({
      engine: {
        backgroundState: {
          VendorOnboardingController: vendor
            ? { vendors: { kalshi: vendor } }
            : {},
        },
      },
    }) as unknown as RootState;

  it.each([
    [{ step: 'decision', status: 'approved' }, true],
    [{ step: 'decision', status: 'pending' }, false],
    [{ step: 'decision', status: 'rejected' }, false],
    [{ step: 'sumsub', status: 'approved' }, false],
    [undefined, false],
  ] as const)('reads %j as %s', (vendor, expected) => {
    expect(selectIsKalshiKycApproved(stateWith(vendor))).toBe(expected);
  });
});
