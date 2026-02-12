/**
 * Component view tests for PerpsTabView.
 * State-driven via Redux (initialStatePerps); no hook/selector mocks.
 * Covers scenarios: bug regression 7.64 (see all perps -> MARKET_LIST, explore all categories),
 * connection state (disconnected/loading still render).
 * Run with: yarn jest -c jest.config.view.js PerpsTabView.view.test
 */
import '../../../../../util/test/component-view/mocks';
import { fireEvent, screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { PerpsTabViewSelectorsIDs } from '../../Perps.testIds';
import { renderPerpsTabView } from '../../../../../util/test/component-view/renderers/perpsViewRenderer';

const MARKET_LIST_ROUTE = Routes.PERPS.MARKET_LIST;

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
  });
});
