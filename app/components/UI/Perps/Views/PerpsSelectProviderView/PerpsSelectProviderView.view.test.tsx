/**
 * Component view tests for PerpsSelectProviderView.
 * State-driven via Redux and stream overrides; no hook mocks.
 */
import '../../../../../../tests/component-view/mocks';

import { screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { renderPerpsSelectProviderView } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';

describe('PerpsSelectProviderView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      await screen.findByTestId('perps-select-provider-sheet'),
    ).toBeOnTheScreen();
  });

  it('renders a close button on the bottom sheet', async () => {
    renderPerpsSelectProviderView();

    expect(
      await screen.findByTestId('perps-select-provider-sheet-close-button'),
    ).toBeOnTheScreen();
  });
});
