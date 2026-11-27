import type { RootState } from '../../../../reducers';
import {
  getKalshiBannerState,
  selectKalshiBannerState,
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

describe('selectKalshiBannerState', () => {
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
    [{ step: 'decision', status: 'approved' }, 'verified'],
    [{ step: 'decision', status: 'pending' }, 'verifying'],
    [{ step: 'decision', status: 'rejected' }, 'cantVerify'],
    [{ step: 'sumsub', status: 'approved' }, 'needMoreInfo'],
    [undefined, 'getStarted'],
  ] as const)('maps vendor %j to %s', (vendor, expected) => {
    expect(selectKalshiBannerState(stateWith(vendor))).toBe(expected);
  });
});
