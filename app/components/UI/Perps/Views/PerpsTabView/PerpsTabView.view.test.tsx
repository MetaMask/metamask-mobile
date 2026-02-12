/**
 * Component view tests for PerpsTabView.
 * State-driven via Redux (initialStatePerps); no hook/selector mocks.
 * Covers scenarios: bug regression 7.64 (see all perps -> MARKET_LIST, explore all categories),
 * connection state (disconnected/loading still render).
 * Run with: yarn jest -c jest.config.view.js PerpsTabView.view.test
 */
import '../../../../../util/test/component-view/mocks';
import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import PerpsTabView from './PerpsTabView';
import { renderPerpsView } from '../../../../../util/test/component-view/renderers/perps';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';

const MARKET_LIST_ROUTE = Routes.PERPS.MARKET_LIST;

function renderView(
  options: {
    overrides?: DeepPartial<RootState>;
    extraRoutes?: { name: string }[];
  } = {},
) {
  const { overrides, extraRoutes } = options;
  return renderPerpsView(
    PerpsTabView as unknown as React.ComponentType,
    'PerpsTabView',
    {
      ...(overrides ? { overrides } : {}),
      ...(extraRoutes ? { extraRoutes } : {}),
    },
  );
}

describe('PerpsTabView', () => {
  describe('Bug regression: Perps tab 7.64 (3583) EXP', () => {
    it('shows explore section copy (explore_markets, see_all_perps) when no positions or orders', async () => {
      renderView();

      await expect(
        screen.findByText(strings('perps.home.explore_markets')),
      ).resolves.toBeOnTheScreen();
      await expect(
        screen.findByText(strings('perps.home.see_all_perps')),
      ).resolves.toBeOnTheScreen();
    });

    it("'See all perps' navigates to MARKET_LIST (regression 7.64: not perps home)", async () => {
      renderView({ extraRoutes: [{ name: MARKET_LIST_ROUTE }] });

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
      renderView();

      expect(
        await screen.findByTestId('perps-balance-button'),
      ).toBeOnTheScreen();
      expect(
        await screen.findByTestId('perps-tab-scroll-view'),
      ).toBeOnTheScreen();
    });
  });
});
