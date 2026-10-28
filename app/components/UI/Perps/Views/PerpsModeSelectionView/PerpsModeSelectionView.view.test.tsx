/**
 * Component view tests for PerpsModeSelectionView.
 * State-driven via Redux and stream overrides; no hook mocks.
 */
import '../../../../../../tests/component-view/mocks';

import React from 'react';
import { Text } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { PERPS_EVENT_VALUE } from '@metamask/perps-controller';
import Engine from '../../../../../core/Engine';
import { strings } from '../../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { analytics } from '../../../../../util/analytics/analytics';
import { renderPerpsView } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import { getRouteParamsProbeTestId } from '../../../../../../tests/component-view/render';
import { PerpsModeSelectionBottomSheetSelectorsIDs } from '../../Perps.testIds';
import Routes from '../../../../../constants/navigation/Routes';
import {
  PERPS_HEADER_AB_TEST_KEY,
  PerpsHeaderNavVariant,
} from '../../abTestConfig';
import PerpsModeSelectionView from './PerpsModeSelectionView';

/**
 * Registers a landing probe at `routeName` that renders its params (like
 * `createRouteParamsProbe`) and also pushes `landed:<routeName>` onto
 * `sequence` from an effect, so tests can prove real exposure fires before
 * the sheet's navigation reset/navigate lands on the destination screen.
 */
const makeLandingProbe = (
  routeName: string,
  sequence: string[],
): React.ComponentType<unknown> => {
  const LandingProbe: React.FC = () => {
    const route = useRoute();
    React.useEffect(() => {
      sequence.push(`landed:${routeName}`);
    }, []);
    return (
      <Text testID={getRouteParamsProbeTestId(routeName)}>
        {JSON.stringify(route.params)}
      </Text>
    );
  };
  return LandingProbe as React.ComponentType<unknown>;
};

const readLandedParams = async (routeName: string) => {
  const probe = await screen.findByTestId(getRouteParamsProbeTestId(routeName));
  return JSON.parse(String(probe.props.children)) as Record<string, unknown>;
};

describe('PerpsModeSelectionView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the sheet with title, subtitle, and both Lite and Pro options', async () => {
    renderPerpsView(
      PerpsModeSelectionView as unknown as React.ComponentType,
      Routes.PERPS.MODALS.MODE_SELECTION,
    );

    // Title and subtitle
    expect(
      await screen.findByText(strings('perps.mode.selection_title')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.mode.selection_subtitle')),
    ).toBeOnTheScreen();

    // Both mode options present
    expect(screen.getByText(strings('perps.mode.lite'))).toBeOnTheScreen();
    expect(screen.getByText(strings('perps.mode.pro'))).toBeOnTheScreen();

    // Sheet container
    expect(
      screen.getByTestId(PerpsModeSelectionBottomSheetSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('pressing Lite calls setPerpsMode with "lite"', async () => {
    const setPerpsMode = jest.mocked(
      Engine.context.PerpsController.setPerpsMode,
    );

    renderPerpsView(
      PerpsModeSelectionView as unknown as React.ComponentType,
      Routes.PERPS.MODALS.MODE_SELECTION,
      { initialParams: { entry: 'home' } },
    );

    fireEvent.press(
      await screen.findByTestId(
        PerpsModeSelectionBottomSheetSelectorsIDs.LITE_OPTION,
      ),
    );

    await waitFor(() => {
      expect(setPerpsMode).toHaveBeenCalledWith('lite');
    });
    expect(setPerpsMode).toHaveBeenCalledTimes(1);
  });

  it('pressing Pro calls setPerpsMode with "pro"', async () => {
    const setPerpsMode = jest.mocked(
      Engine.context.PerpsController.setPerpsMode,
    );

    renderPerpsView(
      PerpsModeSelectionView as unknown as React.ComponentType,
      Routes.PERPS.MODALS.MODE_SELECTION,
      { initialParams: { entry: 'home' } },
    );

    fireEvent.press(
      await screen.findByTestId(
        PerpsModeSelectionBottomSheetSelectorsIDs.PRO_OPTION,
      ),
    );

    await waitFor(() => {
      expect(setPerpsMode).toHaveBeenCalledWith('pro');
    });
    expect(setPerpsMode).toHaveBeenCalledTimes(1);
  });

  // Real assignment/exposure for the home/trade Pro-selection cases
  // (TAT-4021 / perpsTAT4021AbtestPerpsHeaderMarketList), driven by Redux
  // flag/mode/watchlist state through the real useABTest hook — no hook
  // mocks. See PerpsModeSelectionView.test.tsx for the Lite/dismiss/
  // market-entry contracts that don't arm Pro-entry exposure.
  describe('Pro-selection treatment routing and exposure (TAT-4021)', () => {
    let sequence: string[];
    let trackEventSpy: jest.SpyInstance;

    beforeEach(() => {
      sequence = [];
      trackEventSpy = jest
        .spyOn(analytics, 'trackEvent')
        .mockImplementation((event) => {
          if (event.name === MetaMetricsEvents.EXPERIMENT_VIEWED.category) {
            sequence.push('experiment-viewed');
          }
        });
    });

    afterEach(() => {
      trackEventSpy.mockRestore();
    });

    it('emits real Experiment Viewed exposure before resetting onto the default Pro market, for a control Trade-menu Pro selection', async () => {
      renderPerpsView(
        PerpsModeSelectionView as unknown as React.ComponentType,
        Routes.PERPS.MODALS.MODE_SELECTION,
        {
          mainMount: 'perps-modal',
          overrides: {
            engine: {
              backgroundState: {
                RemoteFeatureFlagController: {
                  remoteFeatureFlags: {
                    perpsProModeEnabled: {
                      enabled: true,
                      minimumVersion: '0.0.0',
                    },
                    [PERPS_HEADER_AB_TEST_KEY]: PerpsHeaderNavVariant.Control,
                  },
                },
              },
            },
          },
          extraRoutes: [
            {
              name: Routes.PERPS.MARKET_DETAILS,
              mount: 'perps-root',
              Component: makeLandingProbe(
                Routes.PERPS.MARKET_DETAILS,
                sequence,
              ),
            },
          ],
        },
      );

      fireEvent.press(
        await screen.findByTestId(
          PerpsModeSelectionBottomSheetSelectorsIDs.PRO_OPTION,
        ),
      );

      expect(await readLandedParams(Routes.PERPS.MARKET_DETAILS)).toEqual(
        expect.objectContaining({
          market: expect.objectContaining({ symbol: 'BTC' }),
          source: PERPS_EVENT_VALUE.SOURCE.TRADE_MENU_ACTION,
        }),
      );

      // Real exposure (from the actual useABTest effect) commits before the
      // "leave" effect's navigate() lands on the destination screen — both
      // fire in the same render flush, in hook declaration order.
      expect(sequence).toEqual([
        'experiment-viewed',
        `landed:${Routes.PERPS.MARKET_DETAILS}`,
      ]);
    });

    it('does not emit Experiment Viewed exposure when a Trade-menu chooser selection stays on Lite', async () => {
      renderPerpsView(
        PerpsModeSelectionView as unknown as React.ComponentType,
        Routes.PERPS.MODALS.MODE_SELECTION,
        {
          mainMount: 'perps-modal',
          extraRoutes: [
            {
              name: Routes.PERPS.PERPS_HOME,
              mount: 'perps-root',
              Component: makeLandingProbe(Routes.PERPS.PERPS_HOME, sequence),
            },
          ],
        },
      );

      fireEvent.press(
        await screen.findByTestId(
          PerpsModeSelectionBottomSheetSelectorsIDs.LITE_OPTION,
        ),
      );

      await screen.findByTestId(
        getRouteParamsProbeTestId(Routes.PERPS.PERPS_HOME),
      );

      expect(sequence).not.toContain('experiment-viewed');
    });

    it('does not emit exposure and falls back to Perps Home when Pro is selected but the Pro-mode flag is off', async () => {
      renderPerpsView(
        PerpsModeSelectionView as unknown as React.ComponentType,
        Routes.PERPS.MODALS.MODE_SELECTION,
        {
          mainMount: 'perps-modal',
          overrides: {
            engine: {
              backgroundState: {
                RemoteFeatureFlagController: {
                  remoteFeatureFlags: {
                    perpsProModeEnabled: {
                      enabled: false,
                      minimumVersion: '0.0.0',
                    },
                    [PERPS_HEADER_AB_TEST_KEY]: PerpsHeaderNavVariant.Treatment,
                  },
                },
              },
            },
          },
          extraRoutes: [
            {
              name: Routes.PERPS.PERPS_HOME,
              mount: 'perps-root',
              Component: makeLandingProbe(Routes.PERPS.PERPS_HOME, sequence),
            },
          ],
        },
      );

      fireEvent.press(
        await screen.findByTestId(
          PerpsModeSelectionBottomSheetSelectorsIDs.PRO_OPTION,
        ),
      );

      await screen.findByTestId(
        getRouteParamsProbeTestId(Routes.PERPS.PERPS_HOME),
      );

      expect(sequence).not.toContain('experiment-viewed');
    });

    it('opens the market list on Watchlist and emits real exposure before departure, for a treatment user selecting Pro from Perps Home', async () => {
      renderPerpsView(
        PerpsModeSelectionView as unknown as React.ComponentType,
        Routes.PERPS.MODALS.MODE_SELECTION,
        {
          mainMount: 'perps-modal',
          initialParams: {
            entry: 'home',
            source: PERPS_EVENT_VALUE.SOURCE.PERPS_HOME,
          },
          overrides: {
            engine: {
              backgroundState: {
                PerpsController: {
                  watchlistMarkets: { testnet: [], mainnet: ['ETH'] },
                },
                RemoteFeatureFlagController: {
                  remoteFeatureFlags: {
                    perpsProModeEnabled: {
                      enabled: true,
                      minimumVersion: '0.0.0',
                    },
                    [PERPS_HEADER_AB_TEST_KEY]: PerpsHeaderNavVariant.Treatment,
                  },
                },
              },
            },
          },
          extraRoutes: [
            {
              name: Routes.PERPS.MARKET_LIST,
              mount: 'perps-root',
              Component: makeLandingProbe(Routes.PERPS.MARKET_LIST, sequence),
            },
          ],
        },
      );

      fireEvent.press(
        await screen.findByTestId(
          PerpsModeSelectionBottomSheetSelectorsIDs.PRO_OPTION,
        ),
      );

      expect(await readLandedParams(Routes.PERPS.MARKET_LIST)).toEqual(
        expect.objectContaining({
          source: PERPS_EVENT_VALUE.SOURCE.PERPS_HOME,
          homeDroppedFromHistory: true,
          showWatchlistOnly: true,
        }),
      );

      expect(sequence).toEqual([
        'experiment-viewed',
        `landed:${Routes.PERPS.MARKET_LIST}`,
      ]);
    });

    it("opens the market list on All when a treatment user's watchlist is empty, selecting Pro from Perps Home", async () => {
      renderPerpsView(
        PerpsModeSelectionView as unknown as React.ComponentType,
        Routes.PERPS.MODALS.MODE_SELECTION,
        {
          mainMount: 'perps-modal',
          initialParams: {
            entry: 'home',
            source: PERPS_EVENT_VALUE.SOURCE.PERPS_HOME,
          },
          overrides: {
            engine: {
              backgroundState: {
                RemoteFeatureFlagController: {
                  remoteFeatureFlags: {
                    perpsProModeEnabled: {
                      enabled: true,
                      minimumVersion: '0.0.0',
                    },
                    [PERPS_HEADER_AB_TEST_KEY]: PerpsHeaderNavVariant.Treatment,
                  },
                },
              },
            },
          },
          extraRoutes: [
            {
              name: Routes.PERPS.MARKET_LIST,
              mount: 'perps-root',
              Component: makeLandingProbe(Routes.PERPS.MARKET_LIST, sequence),
            },
          ],
        },
      );

      fireEvent.press(
        await screen.findByTestId(
          PerpsModeSelectionBottomSheetSelectorsIDs.PRO_OPTION,
        ),
      );

      expect(await readLandedParams(Routes.PERPS.MARKET_LIST)).toEqual(
        expect.objectContaining({
          source: PERPS_EVENT_VALUE.SOURCE.PERPS_HOME,
          homeDroppedFromHistory: true,
          showWatchlistOnly: false,
          defaultMarketTypeFilter: 'all',
        }),
      );
    });

    it('resets onto the default Pro market for a control user selecting Pro from Perps Home', async () => {
      renderPerpsView(
        PerpsModeSelectionView as unknown as React.ComponentType,
        Routes.PERPS.MODALS.MODE_SELECTION,
        {
          mainMount: 'perps-modal',
          initialParams: {
            entry: 'home',
            source: PERPS_EVENT_VALUE.SOURCE.PERPS_HOME,
          },
          overrides: {
            engine: {
              backgroundState: {
                RemoteFeatureFlagController: {
                  remoteFeatureFlags: {
                    perpsProModeEnabled: {
                      enabled: true,
                      minimumVersion: '0.0.0',
                    },
                    [PERPS_HEADER_AB_TEST_KEY]: PerpsHeaderNavVariant.Control,
                  },
                },
              },
            },
          },
          extraRoutes: [
            {
              name: Routes.PERPS.MARKET_DETAILS,
              mount: 'perps-root',
              Component: makeLandingProbe(
                Routes.PERPS.MARKET_DETAILS,
                sequence,
              ),
            },
          ],
        },
      );

      fireEvent.press(
        await screen.findByTestId(
          PerpsModeSelectionBottomSheetSelectorsIDs.PRO_OPTION,
        ),
      );

      expect(await readLandedParams(Routes.PERPS.MARKET_DETAILS)).toEqual(
        expect.objectContaining({
          market: { symbol: 'BTC' },
          source: PERPS_EVENT_VALUE.SOURCE.PERPS_HOME,
          homeDroppedFromHistory: true,
        }),
      );
    });
  });
});
