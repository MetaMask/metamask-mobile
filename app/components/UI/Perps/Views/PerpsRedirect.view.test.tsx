/**
 * Component view tests for PerpsRedirect.
 * Verifies the loading state shown while the connection initializes.
 * State-driven via Redux and stream overrides; no hook mocks.
 */
import '../../../../../tests/component-view/mocks';

import { screen } from '@testing-library/react-native';
import { renderPerpsView } from '../../../../../tests/component-view/renderers/perpsViewRenderer';
import { PerpsLoaderSelectorsIDs } from '../Perps.testIds';
import Routes from '../../../../constants/navigation/Routes';
import PerpsRedirect from './PerpsRedirect';

jest.mock('../../../../core/NavigationService', () => ({
  __esModule: true,
  default: { navigation: { navigate: jest.fn(), setParams: jest.fn() } },
}));

describe('PerpsRedirect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the full-screen loader', async () => {
    renderPerpsView(
      PerpsRedirect as unknown as React.ComponentType,
      Routes.PERPS.PERPS_TAB,
      {
        extraRoutes: [{ name: Routes.WALLET.HOME }],
      },
    );

    expect(
      await screen.findByTestId(PerpsLoaderSelectorsIDs.FULLSCREEN),
    ).toBeOnTheScreen();
  });

  it('shows a redirecting message when connected and initialized', async () => {
    renderPerpsView(
      PerpsRedirect as unknown as React.ComponentType,
      Routes.PERPS.PERPS_TAB,
      {
        extraRoutes: [{ name: Routes.WALLET.HOME }],
      },
    );

    expect(
      await screen.findByText('Redirecting to Perps trading...'),
    ).toBeOnTheScreen();
  });
});
