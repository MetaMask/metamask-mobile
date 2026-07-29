import { getMoneySliceStatus } from './useMoneySlice';

const READY_INPUT = {
  isFeatureEnabled: true,
  isGeoEligible: true,
  hasMoneyAccount: true,
  isBalanceLoading: false,
  isBalanceFetchError: false,
  hasTokenTotal: true,
};

describe('getMoneySliceStatus', () => {
  it('requires feature, geo, and account eligibility', () => {
    expect(getMoneySliceStatus({ ...READY_INPUT, isGeoEligible: false })).toBe(
      'ineligible',
    );
  });

  it('distinguishes loading, error, and a canonical ready value', () => {
    expect(
      getMoneySliceStatus({ ...READY_INPUT, isBalanceLoading: true }),
    ).toBe('loading');
    expect(
      getMoneySliceStatus({ ...READY_INPUT, isBalanceFetchError: true }),
    ).toBe('error');
    expect(getMoneySliceStatus(READY_INPUT)).toBe('ready');
  });
});
