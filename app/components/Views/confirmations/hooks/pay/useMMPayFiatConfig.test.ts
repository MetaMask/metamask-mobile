import { cloneDeep } from 'lodash';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useMMPayFiatConfig } from './useMMPayFiatConfig';
import { mockedEmptyFlagsState } from '../../../../../selectors/featureFlagController/mocks';

describe('useMMPayFiatConfig', () => {
  it('returns selector value from store', () => {
    const state = cloneDeep(mockedEmptyFlagsState);
    state.engine.backgroundState.RemoteFeatureFlagController.remoteFeatureFlags =
      {
        confirmations_pay_fiat: { enabled: true },
      };

    const { result } = renderHookWithProvider(useMMPayFiatConfig, { state });

    expect(result.current).toEqual({ enabled: true });
  });
});
