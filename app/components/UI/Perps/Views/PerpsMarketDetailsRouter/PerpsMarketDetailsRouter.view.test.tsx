/**
 * Component view tests for PerpsMarketDetailsRouter.
 * Verifies that the router renders the lite layout (PerpsMarketDetailsView)
 * in the default mode and the pro layout (PerpsProMarketView) in pro mode.
 * State-driven via Redux and stream overrides; no hook mocks.
 */
import '../../../../../../tests/component-view/mocks';

import {
  PerpsMode,
  type SwitchProviderResult,
} from '@metamask/perps-controller';

import { act, cleanup, screen, waitFor } from '@testing-library/react-native';
import Engine from '../../../../../core/Engine';
import { updateBgState } from '../../../../../core/redux/slices/engine';
import { strings } from '../../../../../../locales/i18n';
import { renderPerpsView } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import {
  PerpsMarketDetailsViewSelectorsIDs,
  PerpsProMarketViewSelectorsIDs,
} from '../../Perps.testIds';
import { PerpsOutreachBannerSelectorsIDs } from '../../components/PerpsOutreachBanner';
import Routes from '../../../../../constants/navigation/Routes';
import {
  clearPerpsOutreachApiMocks,
  setupPerpsOutreachApiMock,
} from '../../../../../../tests/component-view/api-mocking/perpsOutreach';
import PerpsMarketDetailsRouter from './PerpsMarketDetailsRouter';

const defaultMarket = {
  symbol: 'ETH',
  name: 'Ethereum',
  price: '$2,000.00',
  change24h: '+$50.00',
  change24hPercent: '+2.5%',
  volume: '$1.5B',
  openInterest: '$500M',
  maxLeverage: '50x',
  marketType: 'crypto',
};

describe('PerpsMarketDetailsRouter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(Engine.context.PerpsController.switchProvider)
      .mockReset()
      .mockResolvedValue({ success: true, providerId: 'hyperliquid' });
    setupPerpsOutreachApiMock();
  });

  afterEach(() => {
    cleanup();
    clearPerpsOutreachApiMocks();
  });

  it('renders the lite market details layout in the default (non-pro) mode', async () => {
    renderPerpsView(
      PerpsMarketDetailsRouter as unknown as React.ComponentType,
      Routes.PERPS.MARKET_DETAILS,
      {
        mode: 'lite',
        initialParams: { market: defaultMarket },
      },
    );

    // PerpsMarketDetailsView has a distinct container testId vs PerpsProMarketView
    expect(
      await screen.findByTestId(PerpsMarketDetailsViewSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      await screen.findByTestId(PerpsOutreachBannerSelectorsIDs.BANNER),
    ).toBeOnTheScreen();
  });

  it('renders the pro market layout in pro mode', async () => {
    renderPerpsView(
      PerpsMarketDetailsRouter as unknown as React.ComponentType,
      Routes.PERPS.MARKET_DETAILS,
      {
        mode: 'pro',
        initialParams: {
          market: {
            ...defaultMarket,
            providerId: 'hyperliquid',
            szDecimals: 2,
          },
        },
        // Pro layout requires both mode:'pro' in PerpsController AND the remote flag
        overrides: {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  perpsProModeEnabled: {
                    enabled: true,
                    minimumVersion: '0.0.0',
                  },
                },
              },
            },
          },
        },
      },
    );

    // PerpsProMarketView has a distinct container testId vs PerpsMarketDetailsView
    expect(
      await screen.findByTestId(PerpsProMarketViewSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      await screen.findByTestId(PerpsOutreachBannerSelectorsIDs.BANNER),
    ).toBeOnTheScreen();
  });
  const aggregatedLighterOptions = {
    mode: 'pro' as const,
    initialParams: {
      market: {
        ...defaultMarket,
        providerId: 'lighter' as const,
        maxLeverage: '20x',
        szDecimals: 3,
      },
    },
    overrides: {
      engine: {
        backgroundState: {
          PerpsController: { activeProvider: 'aggregated' as const },
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              perpsProModeEnabled: { enabled: true, minimumVersion: '0.0.0' },
            },
          },
        },
      },
    },
  };

  it('keeps the inline Pro form unmounted until the venue switch completes', async () => {
    let finishSwitch!: (result: SwitchProviderResult) => void;
    jest
      .mocked(Engine.context.PerpsController.switchProvider)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishSwitch = resolve;
          }),
      );
    const { store } = renderPerpsView(
      PerpsMarketDetailsRouter,
      Routes.PERPS.MARKET_DETAILS,
      aggregatedLighterOptions,
    );
    await waitFor(() =>
      expect(
        Engine.context.PerpsController.switchProvider,
      ).toHaveBeenCalledWith('lighter'),
    );
    expect(
      screen.queryByTestId(PerpsProMarketViewSelectorsIDs.CONTAINER),
    ).not.toBeOnTheScreen();

    act(() => {
      const engineWithState = Engine as unknown as {
        state: Record<string, unknown>;
      };
      engineWithState.state = {
        ...engineWithState.state,
        PerpsController: {
          ...store.getState().engine.backgroundState.PerpsController,
          activeProvider: 'lighter',
        },
      };
      store.dispatch(updateBgState({ key: 'PerpsController' }));
    });
    expect(
      screen.queryByTestId(PerpsProMarketViewSelectorsIDs.CONTAINER),
    ).not.toBeOnTheScreen();
    await act(async () => {
      finishSwitch({ success: true, providerId: 'lighter' });
    });

    expect(
      await screen.findByTestId(PerpsProMarketViewSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(Engine.context.PerpsController.switchProvider).toHaveBeenCalledTimes(
      1,
    );
  });

  it.each(['failure', 'rejection'])(
    'keeps the Pro form closed after a switch %s',
    async (outcome) => {
      if (outcome === 'failure') {
        jest
          .mocked(Engine.context.PerpsController.switchProvider)
          .mockResolvedValueOnce({
            success: false,
            providerId: 'lighter',
            error: 'Provider unavailable',
          });
      } else {
        jest
          .mocked(Engine.context.PerpsController.switchProvider)
          .mockRejectedValueOnce(new Error('Provider unavailable'));
      }

      renderPerpsView(
        PerpsMarketDetailsRouter,
        Routes.PERPS.MARKET_DETAILS,
        aggregatedLighterOptions,
      );

      expect(
        await screen.findByText(strings('perps.errors.connectionFailed.retry')),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(PerpsProMarketViewSelectorsIDs.CONTAINER),
      ).not.toBeOnTheScreen();
      expect(
        Engine.context.PerpsController.switchProvider,
      ).toHaveBeenCalledTimes(1);
    },
  );
  it('renders Lite after a failed Pro venue switch on the same route', async () => {
    jest
      .mocked(Engine.context.PerpsController.switchProvider)
      .mockResolvedValueOnce({
        success: false,
        providerId: 'lighter',
        error: 'Provider unavailable',
      });
    const { store } = renderPerpsView(
      PerpsMarketDetailsRouter,
      Routes.PERPS.MARKET_DETAILS,
      aggregatedLighterOptions,
    );
    expect(
      await screen.findByText(strings('perps.errors.connectionFailed.retry')),
    ).toBeOnTheScreen();

    act(() => {
      const engineWithState = Engine as unknown as {
        state: Record<string, unknown>;
      };
      engineWithState.state = {
        ...engineWithState.state,
        PerpsController: {
          ...store.getState().engine.backgroundState.PerpsController,
          mode: PerpsMode.Lite,
        },
      };
      store.dispatch(updateBgState({ key: 'PerpsController' }));
    });

    expect(
      await screen.findByTestId(PerpsMarketDetailsViewSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(strings('perps.errors.connectionFailed.retry')),
    ).not.toBeOnTheScreen();
    expect(Engine.context.PerpsController.switchProvider).toHaveBeenCalledTimes(
      1,
    );
  });
});
