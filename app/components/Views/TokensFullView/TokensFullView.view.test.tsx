import '../../../../tests/component-view/mocks';
import { waitFor } from '@testing-library/react-native';
import type { DeepPartial } from '../../../util/test/renderWithProvider';
import type { RootState } from '../../../reducers';
import { describeForPlatforms } from '../../../util/test/platform';
import Engine from '../../../core/Engine';
import { renderTokensFullView } from '../../../../tests/component-view/renderers/tokensFullView';
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

describeForPlatforms('TokensFullView - Component Tests', () => {
  it('resets token sort config when Tokens Full View unmounts', async () => {
    const setTokenSortConfigSpy = jest.spyOn(
      Engine.context.PreferencesController,
      'setTokenSortConfig',
    );
    setTokenSortConfigSpy.mockClear();

    const { findByText, unmount } = renderTokensFullView({
      overrides: homepageSectionsV1EnabledOverrides,
    });

    await findByText('Tokens');

    unmount();

    await waitFor(() => {
      expect(setTokenSortConfigSpy).toHaveBeenCalledWith(
        DEFAULT_TOKEN_SORT_CONFIG,
      );
    });

    setTokenSortConfigSpy.mockRestore();
  });
});
