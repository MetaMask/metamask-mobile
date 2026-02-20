/**
 * Component view tests for PerpsTabView.
 * State-driven via Redux (initialStatePerps); no hook/selector mocks.
 * Covers scenarios: bug regression 7.64 (see all perps -> MARKET_LIST, explore all categories),
 * connection state (disconnected/loading still render).
 * Run with: yarn jest -c jest.config.view.js PerpsTabView.view.test
 */
import '../../../../../../tests/component-view/mocks';
import { fireEvent, screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { PerpsTabViewSelectorsIDs } from '../../Perps.testIds';
import { renderPerpsTabView } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';

const MARKET_LIST_ROUTE = Routes.PERPS.MARKET_LIST;
const OPEN_POSITION = {
  symbol: 'ETH',
  size: '2.5',
  marginUsed: '500',
  entryPrice: '2000',
  liquidationPrice: '1900',
  unrealizedPnl: '100',
  returnOnEquity: '0.2',
  leverage: { value: 10, type: 'isolated' as const },
  cumulativeFunding: { sinceOpen: '5', allTime: '10', sinceChange: '2' },
  positionValue: '5000',
  maxLeverage: 50,
  takeProfitCount: 0,
  stopLossCount: 0,
};

describe('PerpsTabView', () => {
  describe('Bug regression: Perps tab 7.64 (3583) EXP', () => {
    it('shows explore section copy (explore_markets, see_all_perps) when no positions or orders', async () => {
      renderPerpsTabView();

      await expect(
        screen.findByText(strings('perps.home.explore_markets')),
      ).resolves.toBeOnTheScreen();
      await expect(
        screen.findByText(strings('perps.home.see_all_perps')),
      ).resolves.toBeOnTheScreen();
    });

    it("'See all perps' navigates to MARKET_LIST (regression 7.64: not perps home)", async () => {
      renderPerpsTabView({ extraRoutes: [{ name: MARKET_LIST_ROUTE }] });

      const seeAllPerps = await screen.findByText(
        strings('perps.home.see_all_perps'),
      );
      fireEvent.press(seeAllPerps);

      expect(
        screen.getByTestId(`route-${MARKET_LIST_ROUTE}`),
      ).toBeOnTheScreen();
    });
  });

  describe('Connection state: connected vs disconnected vs loading', () => {
    it('view renders control bar and scroll when state is default (connected)', async () => {
      renderPerpsTabView();

      expect(
        await screen.findByTestId(PerpsTabViewSelectorsIDs.BALANCE_BUTTON),
      ).toBeOnTheScreen();
      expect(
        await screen.findByTestId(PerpsTabViewSelectorsIDs.SCROLL_VIEW),
      ).toBeOnTheScreen();
    });

    it('renders watchlist section when watchlist markets exist in redux state', async () => {
      renderPerpsTabView({
        overrides: {
          engine: {
            backgroundState: {
              PerpsController: {
                watchlistMarkets: { mainnet: ['ETH'], testnet: [] },
              },
            },
          },
        },
        streamOverrides: {
          marketData: [
            {
              symbol: 'ETH',
              name: 'Ethereum',
              maxLeverage: '50x',
              price: '$2,000',
              change24h: '$0',
              change24hPercent: '0%',
              volume: '$1M',
            },
            {
              symbol: 'BTC',
              name: 'Bitcoin',
              maxLeverage: '50x',
              price: '$50,000',
              change24h: '$0',
              change24hPercent: '0%',
              volume: '$1M',
            },
          ],
        },
      });

      expect(
        await screen.findByText(strings('perps.home.watchlist')),
      ).toBeOnTheScreen();
      expect(screen.getByText('ETH')).toBeOnTheScreen();
    });

    it('shows geo block bottom sheet when Close all is pressed by geo-restricted user', async () => {
      renderPerpsTabView({
        overrides: {
          engine: {
            backgroundState: {
              PerpsController: {
                isEligible: false,
              },
            },
          },
        },
        streamOverrides: {
          positions: [OPEN_POSITION],
        },
      });

      const closeAllButton = await screen.findByText(
        strings('perps.home.close_all'),
      );
      fireEvent.press(closeAllButton);

      expect(
        await screen.findByTestId(
          PerpsTabViewSelectorsIDs.GEO_BLOCK_BOTTOM_SHEET_TOOLTIP,
        ),
      ).toBeOnTheScreen();
    });
  });
});
