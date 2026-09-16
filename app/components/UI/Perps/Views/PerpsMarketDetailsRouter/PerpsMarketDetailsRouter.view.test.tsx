/**
 * Component view tests for PerpsMarketDetailsRouter.
 * Verifies that the router renders the lite layout (PerpsMarketDetailsView)
 * in the default mode and the pro layout (PerpsProMarketView) in pro mode.
 * State-driven via Redux and stream overrides; no hook mocks.
 */
import '../../../../../../tests/component-view/mocks';

import { screen } from '@testing-library/react-native';
import { renderPerpsView } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import {
  PerpsMarketDetailsViewSelectorsIDs,
  PerpsProMarketViewSelectorsIDs,
} from '../../Perps.testIds';
import Routes from '../../../../../constants/navigation/Routes';
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
  });
});
