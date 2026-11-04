import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import renderWithProvider from '../../../../util/test/renderWithProvider';
import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../../core/NavigationService';
import ContextualFooter from './ContextualFooter';
import TradeDashboard from './TradeDashboard';
import {
  enterTradeDashboard,
  enterTradingHub,
  exitContextualSection,
  getContextualNavState,
} from './contextualSection';

jest.mock('../../../../util/haptics');
jest.mock('../../../UI/Money/hooks/useMoneyNavigation', () => ({
  useMoneyNavigation: () => ({ navigateToMoneyHome: jest.fn() }),
}));
jest.mock('../../../../core/NavigationService', () => ({
  __esModule: true,
  default: { navigation: { navigate: jest.fn(), dispatch: jest.fn() } },
}));
jest.mock('../../../UI/Perps', () => ({
  selectPerpsEnabledFlag: () => true,
}));

describe('trade navigation', () => {
  const navigate = NavigationService.navigation.navigate as jest.Mock;

  beforeEach(() => {
    navigate.mockClear();
    exitContextualSection();
  });

  it('renders a blank Trade dashboard with a header and no hub links', () => {
    const { getByRole, queryByTestId } = renderWithProvider(<TradeDashboard />);

    expect(getByRole('header')).toHaveTextContent('Trade');
    expect(queryByTestId('trade-dashboard-swap')).toBeNull();
    expect(queryByTestId('trade-dashboard-perps')).toBeNull();
    expect(queryByTestId('trade-dashboard-collectibles')).toBeNull();
  });

  it('opens the trade footer from the dashboard state with nothing selected', () => {
    enterTradeDashboard();

    const { getByTestId } = renderWithProvider(
      <ContextualFooter homeRouteName={Routes.TRADE_DASHBOARD} />,
    );

    expect(getContextualNavState()).toEqual({
      section: 'trading',
      tab: 'dashboard',
    });
    for (const id of ['home', 'swap', 'perps', 'predictions', 'collectibles']) {
      expect(
        getByTestId(`trade-hub-tab-${id}`).props.accessibilityState,
      ).toEqual({ selected: false });
    }
  });

  it('selects Perps and navigates there from the trade footer', () => {
    enterTradeDashboard();

    const { getByTestId } = renderWithProvider(
      <ContextualFooter
        homeRouteName={Routes.TRADE_DASHBOARD}
        rootRouteName={Routes.HOME_TABS}
      />,
    );

    fireEvent.press(getByTestId('trade-hub-tab-perps'));

    expect(getContextualNavState()).toEqual({
      section: 'trading',
      tab: 'perps',
    });
    expect(navigate).toHaveBeenCalledWith(Routes.PERPS.ROOT);
    expect(getByTestId('trade-hub-tab-perps').props.accessibilityState).toEqual(
      { selected: true },
    );
    expect(getByTestId('trade-hub-tab-swap').props.accessibilityState).toEqual({
      selected: false,
    });
  });

  it('opens Collectibles from the trade footer', () => {
    enterTradeDashboard();

    const { getByTestId, queryByTestId } = renderWithProvider(
      <ContextualFooter homeRouteName={Routes.TRADE_DASHBOARD} />,
    );

    fireEvent.press(getByTestId('trade-hub-tab-collectibles'));

    expect(getContextualNavState()).toEqual({
      section: 'collectibles',
      tab: 'popular',
    });
    expect(navigate).toHaveBeenCalledWith(Routes.COLLECTIBLES_VIEW);
    expect(queryByTestId('trade-hub-tab-swap')).toBeNull();
    expect(
      getByTestId('contextual-collectibles-tab-popular'),
    ).toBeOnTheScreen();
    expect(
      getByTestId('contextual-collectibles-tab-popular').props
        .accessibilityState,
    ).toEqual({ selected: true });
  });

  it('keeps the selected hub when replacing from inside that hub', () => {
    enterTradingHub('swap');

    const { getByTestId } = renderWithProvider(
      <ContextualFooter rootRouteName={Routes.BRIDGE.ROOT} />,
    );

    fireEvent.press(getByTestId('trade-hub-tab-predictions'));

    expect(getContextualNavState().tab).toBe('predictions');
    expect(NavigationService.navigation.dispatch).toHaveBeenCalled();
  });
});
