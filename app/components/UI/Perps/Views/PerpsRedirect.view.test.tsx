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
        connectionValue: {
          isConnected: false,
          isConnecting: true,
          isInitialized: false,
          error: null,
          connect: async () => undefined,
          disconnect: async () => undefined,
          resetError: () => undefined,
          reconnectWithNewContext: async () => undefined,
        },
      },
    );

    expect(
      await screen.findByTestId(PerpsLoaderSelectorsIDs.FULLSCREEN),
    ).toBeOnTheScreen();
  });

  it('shows a redirecting message while waiting for connection', async () => {
    renderPerpsView(
      PerpsRedirect as unknown as React.ComponentType,
      Routes.PERPS.PERPS_TAB,
      {
        extraRoutes: [{ name: Routes.WALLET.HOME }],
        connectionValue: {
          isConnected: false,
          isConnecting: false,
          isInitialized: true,
          error: null,
          connect: async () => undefined,
          disconnect: async () => undefined,
          resetError: () => undefined,
          reconnectWithNewContext: async () => undefined,
        },
      },
    );

    expect(
      await screen.findByText('Redirecting to Perps trading...'),
    ).toBeOnTheScreen();
  });
});
