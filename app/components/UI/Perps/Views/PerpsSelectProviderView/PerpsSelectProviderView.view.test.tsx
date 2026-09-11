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

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.METAMASK_ENVIRONMENT = 'dev';
  });

  afterEach(() => {
    if (originalEnvironment === undefined) {
      delete process.env.METAMASK_ENVIRONMENT;
    } else {
      process.env.METAMASK_ENVIRONMENT = originalEnvironment;
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

  it('does not expose the selector in production', async () => {
    process.env.METAMASK_ENVIRONMENT = 'production';

    renderPerpsSelectProviderView();

    await waitFor(() => {
      expect(
        screen.queryByTestId(PerpsSelectProviderViewSelectorsIDs.SHEET),
      ).not.toBeOnTheScreen();
    });
  });
});
