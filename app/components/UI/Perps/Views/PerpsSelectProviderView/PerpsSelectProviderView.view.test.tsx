/**
 * Component view tests for PerpsSelectProviderView.
 * State-driven via Redux and stream overrides; no hook mocks.
 */
import '../../../../../../tests/component-view/mocks';

import { screen, waitFor } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { renderPerpsSelectProviderView } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import { PerpsSelectProviderViewSelectorsIDs } from '../../Perps.testIds';

describe('PerpsSelectProviderView', () => {
  const originalEnvironment = process.env.METAMASK_ENVIRONMENT;
  const originalLighterOverride = process.env.MM_PERPS_LIGHTER_PROVIDER_ENABLED;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.METAMASK_ENVIRONMENT = 'dev';
    process.env.MM_PERPS_LIGHTER_PROVIDER_ENABLED = 'true';
  });

  afterEach(() => {
    if (originalEnvironment === undefined) {
      delete process.env.METAMASK_ENVIRONMENT;
    } else {
      process.env.METAMASK_ENVIRONMENT = originalEnvironment;
    }
    if (originalLighterOverride === undefined) {
      delete process.env.MM_PERPS_LIGHTER_PROVIDER_ENABLED;
    } else {
      process.env.MM_PERPS_LIGHTER_PROVIDER_ENABLED = originalLighterOverride;
    }
  });

  it('renders the provider selector title', async () => {
    renderPerpsSelectProviderView();

    expect(
      await screen.findByText(strings('perps.provider_selector.title')),
    ).toBeOnTheScreen();
  });

  it('renders the bottom sheet with its testID', async () => {
    renderPerpsSelectProviderView();

    expect(
      await screen.findByTestId(PerpsSelectProviderViewSelectorsIDs.SHEET),
    ).toBeOnTheScreen();
  });

  it('renders a close button on the bottom sheet', async () => {
    renderPerpsSelectProviderView();

    expect(
      await screen.findByTestId(
        PerpsSelectProviderViewSelectorsIDs.CLOSE_BUTTON,
      ),
    ).toBeOnTheScreen();
  });

  it.each(['production', 'dev'])(
    'does not expose the selector in %s without the build opt-in',
    async (environment) => {
      process.env.METAMASK_ENVIRONMENT = environment;
      process.env.MM_PERPS_LIGHTER_PROVIDER_ENABLED = 'false';

      renderPerpsSelectProviderView();

      await waitFor(() => {
        expect(
          screen.queryByTestId(PerpsSelectProviderViewSelectorsIDs.SHEET),
        ).not.toBeOnTheScreen();
      });
    },
  );

  it('exposes the selector in an explicit Lighter production build', async () => {
    process.env.METAMASK_ENVIRONMENT = 'production';
    process.env.MM_PERPS_LIGHTER_PROVIDER_ENABLED = 'true';

    renderPerpsSelectProviderView();

    expect(
      await screen.findByTestId(PerpsSelectProviderViewSelectorsIDs.SHEET),
    ).toBeOnTheScreen();
  });
});
