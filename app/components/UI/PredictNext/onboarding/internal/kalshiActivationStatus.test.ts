import type { RootState } from '../../../../../reducers';
import {
  isKalshiActivationRequired,
  selectIsKalshiKycApproved,
} from './kalshiActivationStatus';

describe('isKalshiActivationRequired', () => {
  it.each([
    ['approved', true],
    ['active', false],
    ['none', false],
    [undefined, false],
  ] as const)('reads %s as %s', (state, expected) => {
    expect(isKalshiActivationRequired(state)).toBe(expected);
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
