import { getEffectiveProviderScope } from './providerScope';
import type { RootState } from '../../../../reducers';

// TEMP(device-testing): getEffectiveProviderScope is hard-forced to `in-app`
// (see providerScope.ts). When the production guard + stored-setting logic is
// restored before merge, restore the env-matrix tests (prod -> off, non-prod ->
// stored setting) alongside it.
describe('getEffectiveProviderScope', () => {
  it('is temporarily forced to in-app for on-device testing', () => {
    expect(getEffectiveProviderScope({} as RootState)).toBe('in-app');
    expect(
      getEffectiveProviderScope({
        fiatOrders: { providerScope: 'off' },
      } as unknown as RootState),
    ).toBe('in-app');
  });
});
