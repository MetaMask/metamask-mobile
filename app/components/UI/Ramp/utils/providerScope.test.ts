import { EnvironmentType } from '@metamask/remote-feature-flag-controller';

import { getEffectiveProviderScope } from './providerScope';
import { getFeatureFlagAppEnvironment } from '../../../../core/Engine/controllers/remote-feature-flag-controller/utils';
import { selectFiatProviderScopeSetting } from '../../../../reducers/fiatOrders';
import type { FiatProviderScope } from '../../../../reducers/fiatOrders/types';
import type { RootState } from '../../../../reducers';

jest.mock(
  '../../../../core/Engine/controllers/remote-feature-flag-controller/utils',
);
jest.mock('../../../../reducers/fiatOrders');

describe('getEffectiveProviderScope', () => {
  const getEnvMock = jest.mocked(getFeatureFlagAppEnvironment);
  const getSettingMock = jest.mocked(selectFiatProviderScopeSetting);
  const state = {} as RootState;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('hard-forces off in production regardless of the stored setting', () => {
    getEnvMock.mockReturnValue(EnvironmentType.Production);
    getSettingMock.mockReturnValue('in-app');

    expect(getEffectiveProviderScope(state)).toBe('off');
    // Short-circuits before reading the setting.
    expect(getSettingMock).not.toHaveBeenCalled();
  });

  it.each(['off', 'in-app', 'all'] as FiatProviderScope[])(
    'returns the stored setting (%s) on non-production builds',
    (scope) => {
      getEnvMock.mockReturnValue(EnvironmentType.Development);
      getSettingMock.mockReturnValue(scope);

      expect(getEffectiveProviderScope(state)).toBe(scope);
    },
  );

  it('returns the stored setting on release-candidate builds', () => {
    getEnvMock.mockReturnValue(EnvironmentType.ReleaseCandidate);
    getSettingMock.mockReturnValue('in-app');

    expect(getEffectiveProviderScope(state)).toBe('in-app');
  });
});
