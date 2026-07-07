import { EnvironmentType } from '@metamask/remote-feature-flag-controller';

import { getEffectiveProviderScope } from './providerScope';
import { getFeatureFlagAppEnvironment } from '../../../../core/Engine/controllers/remote-feature-flag-controller/utils';
import { selectFiatProviderScopeSetting } from '../../../../reducers/fiatOrders';
import { selectMoneyHeadlessProviderScope } from '../../../../selectors/featureFlagController/moneyHeadlessProviderScope';
import type { FiatProviderScope } from '../../../../reducers/fiatOrders/types';
import type { RootState } from '../../../../reducers';

jest.mock(
  '../../../../core/Engine/controllers/remote-feature-flag-controller/utils',
);
jest.mock('../../../../reducers/fiatOrders');
jest.mock(
  '../../../../selectors/featureFlagController/moneyHeadlessProviderScope',
  () => ({
    selectMoneyHeadlessProviderScope: jest.fn(),
  }),
);

describe('getEffectiveProviderScope', () => {
  const getEnvMock = jest.mocked(getFeatureFlagAppEnvironment);
  const getSettingMock = jest.mocked(selectFiatProviderScopeSetting);
  const getRemoteScopeMock = jest.mocked(selectMoneyHeadlessProviderScope);
  const state = {} as RootState;

  beforeEach(() => {
    jest.resetAllMocks();
    // Safe default: remote flag unset resolves to native-only.
    getRemoteScopeMock.mockReturnValue('off');
  });

  describe('production', () => {
    it('is driven solely by the remote flag and ignores the local toggle', () => {
      getEnvMock.mockReturnValue(EnvironmentType.Production);
      getRemoteScopeMock.mockReturnValue('in-app');
      getSettingMock.mockReturnValue('all');

      expect(getEffectiveProviderScope(state)).toBe('in-app');
      // The persisted dev toggle is never read in production.
      expect(getSettingMock).not.toHaveBeenCalled();
    });

    it('stays off in production when the remote flag is off', () => {
      getEnvMock.mockReturnValue(EnvironmentType.Production);
      getRemoteScopeMock.mockReturnValue('off');
      getSettingMock.mockReturnValue('in-app');

      expect(getEffectiveProviderScope(state)).toBe('off');
      expect(getSettingMock).not.toHaveBeenCalled();
    });
  });

  describe('non-production', () => {
    it.each(['in-app', 'all'] as FiatProviderScope[])(
      'lets the local toggle (%s) override the remote flag',
      (scope) => {
        getEnvMock.mockReturnValue(EnvironmentType.Development);
        getSettingMock.mockReturnValue(scope);
        getRemoteScopeMock.mockReturnValue('off');

        expect(getEffectiveProviderScope(state)).toBe(scope);
      },
    );

    it('falls back to the remote flag when the local toggle is off', () => {
      getEnvMock.mockReturnValue(EnvironmentType.Development);
      getSettingMock.mockReturnValue('off');
      getRemoteScopeMock.mockReturnValue('in-app');

      expect(getEffectiveProviderScope(state)).toBe('in-app');
    });

    it('honors the remote flag on release-candidate builds', () => {
      getEnvMock.mockReturnValue(EnvironmentType.ReleaseCandidate);
      getSettingMock.mockReturnValue('off');
      getRemoteScopeMock.mockReturnValue('in-app');

      expect(getEffectiveProviderScope(state)).toBe('in-app');
    });

    it('lets the local toggle override on release-candidate builds', () => {
      getEnvMock.mockReturnValue(EnvironmentType.ReleaseCandidate);
      getSettingMock.mockReturnValue('all');
      getRemoteScopeMock.mockReturnValue('in-app');

      expect(getEffectiveProviderScope(state)).toBe('all');
    });
  });
});
