import '../../../../tests/component-view/mocks';
import { waitFor } from '@testing-library/react-native';
import type { DeepPartial } from '../../../util/test/renderWithProvider';
import type { RootState } from '../../../reducers';
import { describeForPlatforms } from '../../../util/test/platform';
import Engine from '../../../core/Engine';
import { renderDeFiFullView } from '../../../../tests/component-view/renderers/defiFullView';
import { DEFAULT_TOKEN_SORT_CONFIG } from '../../UI/Tokens/util/sortAssets';

const homepageSectionsV1EnabledOverrides = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          homepageSectionsV1: {
            enabled: true,
            featureVersion: '1.0.0',
            minimumVersion: '0.0.1',
          },
        },
      },
    },
  },
} as unknown as DeepPartial<RootState>;

describeForPlatforms('DeFiFullView - Component Tests', () => {
  it('resets token sort config when DeFi Full View unmounts', async () => {
    const setTokenSortConfigSpy = jest.spyOn(
      Engine.context.PreferencesController,
      'setTokenSortConfig',
    );
    setTokenSortConfigSpy.mockClear();

    const { findByText, unmount } = renderDeFiFullView({
      overrides: homepageSectionsV1EnabledOverrides,
    });

    await findByText('DeFi');

    unmount();

    await waitFor(() => {
      expect(setTokenSortConfigSpy).toHaveBeenCalledWith(
        DEFAULT_TOKEN_SORT_CONFIG,
      );
    });

    setTokenSortConfigSpy.mockRestore();
  });
});
