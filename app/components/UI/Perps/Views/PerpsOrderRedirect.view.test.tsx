/**
 * Component view tests for PerpsOrderRedirect.
 * Verifies the loading state and the deposit+navigate flow.
 * State-driven via Redux and stream overrides; no hook mocks.
 */
import '../../../../../tests/component-view/mocks';

import { screen, waitFor } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import { renderPerpsView } from '../../../../../tests/component-view/renderers/perpsViewRenderer';
import { PerpsLoaderSelectorsIDs } from '../Perps.testIds';
import Routes from '../../../../constants/navigation/Routes';
import PerpsOrderRedirect from './PerpsOrderRedirect';

const defaultParams = {
  direction: 'long' as const,
  asset: 'ETH',
  fromTokenDetails: false,
  transactionActiveAbTests: {},
};

describe('PerpsOrderRedirect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Restore default implementation so the call-count test works correctly
    jest
      .mocked(Engine.context.PerpsController.depositWithOrder)
      .mockResolvedValue({
        result: Promise.resolve('0xcomponent-view-deposit'),
      });
  });

  it('always renders the inline loader', async () => {
    // Prevent depositWithOrder from resolving so the loader stays on screen
    jest
      .mocked(Engine.context.PerpsController.depositWithOrder)
      .mockReturnValue(new Promise<never>(() => undefined));

    renderPerpsView(
      PerpsOrderRedirect as unknown as React.ComponentType,
      Routes.PERPS.ORDER_REDIRECT,
      {
        initialParams: defaultParams,
        extraRoutes: [
          {
            name: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
          },
        ],
      },
    );

    expect(
      await screen.findByTestId(PerpsLoaderSelectorsIDs.INLINE),
    ).toBeOnTheScreen();
  });

  it('shows Preparing order message in the loader', async () => {
    // Prevent depositWithOrder from resolving so the loader stays on screen
    jest
      .mocked(Engine.context.PerpsController.depositWithOrder)
      .mockReturnValue(new Promise<never>(() => undefined));

    renderPerpsView(
      PerpsOrderRedirect as unknown as React.ComponentType,
      Routes.PERPS.ORDER_REDIRECT,
      {
        initialParams: defaultParams,
        extraRoutes: [
          {
            name: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
          },
        ],
      },
    );

    expect(await screen.findByText('Preparing order...')).toBeOnTheScreen();
  });

  it('calls depositWithOrder once when connected and initialized', async () => {
    const depositWithOrder = Engine.context.PerpsController
      .depositWithOrder as jest.Mock;

    renderPerpsView(
      PerpsOrderRedirect as unknown as React.ComponentType,
      Routes.PERPS.ORDER_REDIRECT,
      {
        initialParams: defaultParams,
        extraRoutes: [
          {
            name: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
          },
        ],
      },
    );

    await waitFor(() => {
      expect(depositWithOrder).toHaveBeenCalledTimes(1);
    });
  });

  it('replaces the redirect with balance order for Lighter without a deposit', async () => {
    renderPerpsView(PerpsOrderRedirect, Routes.PERPS.ORDER_REDIRECT, {
      initialParams: defaultParams,
      overrides: {
        engine: {
          backgroundState: { PerpsController: { activeProvider: 'lighter' } },
        },
      },
      extraRoutes: [{ name: Routes.PERPS.BALANCE_ORDER }],
    });

    expect(
      await screen.findByTestId(`route-${Routes.PERPS.BALANCE_ORDER}`),
    ).toBeOnTheScreen();
    expect(
      Engine.context.PerpsController.depositWithOrder,
    ).not.toHaveBeenCalled();
  });
});
