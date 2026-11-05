import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import renderWithProvider from '../../../../util/test/renderWithProvider';
import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../../core/NavigationService';
import ContextualFooter from './ContextualFooter';
import ContextualHomeSectionOverlay from './ContextualHomeSectionOverlay';
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
jest.mock('../../../UI/Perps/routes', () => {
  const stubs = jest.requireActual('./tradeInPlaceStubs');
  return { __esModule: true, default: stubs.PerpsStub };
});
jest.mock('../../../UI/Bridge/routes', () => {
  const stubs = jest.requireActual('./tradeInPlaceStubs');
  return { BridgeScreenStack: stubs.SwapStub };
});
jest.mock('../../../UI/PredictNext', () => {
  const stubs = jest.requireActual('./tradeInPlaceStubs');
  return { PredictRoot: stubs.PredictionsStub };
});
jest.mock('../../../Views/Collectibles/CollectiblesView', () => {
  const stubs = jest.requireActual('./tradeInPlaceStubs');
  return {
    __esModule: true,
    default: stubs.CollectiblesStub,
    CollectiblesView: stubs.CollectiblesStub,
  };
});

describe('trade navigation', () => {
  const navigate = NavigationService.navigation.navigate as jest.Mock;

  beforeEach(() => {
    navigate.mockClear();
    exitContextualSection();
  });

  it('renders a blank Trade dashboard with a header and no hub links', () => {
    const { getByRole, getByText, queryByTestId } = renderWithProvider(
      <TradeDashboard />,
    );

    expect(getByRole('header')).toHaveTextContent('Trade');
    expect(getByText('Placeholder for trading overview')).toBeOnTheScreen();
    expect(queryByTestId('trade-dashboard-swap')).toBeNull();
    expect(queryByTestId('trade-dashboard-perps')).toBeNull();
    expect(queryByTestId('collectibles-inplace-screen')).toBeNull();
  });

  it('opens the trade footer on Explore', () => {
    enterTradeDashboard();

    const { getByTestId, queryByTestId } = renderWithProvider(
      <ContextualFooter homeRouteName={Routes.TRADE_DASHBOARD} />,
    );

    expect(getContextualNavState()).toEqual({
      section: 'trading',
      tab: 'explore',
    });
    expect(
      getByTestId('trade-hub-tab-explore').props.accessibilityState,
    ).toEqual({ selected: true });
    for (const id of ['swap', 'perps', 'predictions']) {
      expect(
        getByTestId(`trade-hub-tab-${id}`).props.accessibilityState,
      ).toEqual({ selected: false });
    }
    expect(queryByTestId('trade-hub-tab-collectibles')).toBeNull();
    expect(queryByTestId('trade-hub-tab-home')).toBeNull();
    expect(getByTestId('trade-hub-home-button')).toBeOnTheScreen();
  });

  it('shows Perps in place with no stack push and no back button', () => {
    enterTradeDashboard();

    const { getByTestId, queryByLabelText } = renderWithProvider(
      <ContextualFooter homeRouteName={Routes.TRADE_DASHBOARD} />,
    );

    fireEvent.press(getByTestId('trade-hub-tab-perps'));

    expect(getContextualNavState()).toEqual({
      section: 'trading',
      tab: 'perps',
    });
    expect(navigate).not.toHaveBeenCalledWith(Routes.PERPS.ROOT);
    expect(NavigationService.navigation.dispatch).not.toHaveBeenCalled();
    expect(getByTestId('trade-hub-tab-perps').props.accessibilityState).toEqual(
      { selected: true },
    );

    const screen = renderWithProvider(<TradeDashboard />);
    expect(screen.getByTestId('trade-inplace-perps')).toBeOnTheScreen();
    expect(screen.getByTestId('perps-inplace-screen')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Back')).toBeNull();
    expect(queryByLabelText('Back')).toBeNull();
  });

  it('returns to the trade landing when Explore is pressed', () => {
    enterTradingHub('perps');

    const { getByTestId } = renderWithProvider(
      <ContextualFooter homeRouteName={Routes.TRADE_DASHBOARD} />,
    );

    fireEvent.press(getByTestId('trade-hub-tab-explore'));

    expect(getContextualNavState()).toEqual({
      section: 'trading',
      tab: 'explore',
    });
    expect(
      getByTestId('trade-hub-tab-explore').props.accessibilityState,
    ).toEqual({ selected: true });
  });

  it('opens Collectibles from the default footer, not from Trade', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <ContextualFooter homeRouteName={Routes.WALLET.HOME} />,
    );

    expect(queryByTestId('footer-tab-collectibles')).toBeOnTheScreen();

    fireEvent.press(getByTestId('footer-tab-collectibles'));

    expect(getContextualNavState()).toEqual({
      section: 'collectibles',
      tab: 'popular',
    });
    expect(navigate).not.toHaveBeenCalledWith(Routes.COLLECTIBLES_VIEW);
    expect(queryByTestId('trade-hub-tab-swap')).toBeNull();
    expect(queryByTestId('trade-hub-tab-collectibles')).toBeNull();
    expect(
      getByTestId('contextual-collectibles-tab-popular'),
    ).toBeOnTheScreen();
    expect(
      getByTestId('contextual-collectibles-tab-popular').props
        .accessibilityState,
    ).toEqual({ selected: true });
    expect(queryByTestId('contextual-collectibles-tab-home')).toBeNull();
    expect(
      getByTestId('contextual-collectibles-home-button'),
    ).toBeOnTheScreen();

    const overlay = renderWithProvider(<ContextualHomeSectionOverlay />);
    expect(
      overlay.getByTestId('contextual-collectibles-screen'),
    ).toBeOnTheScreen();
    expect(
      overlay.getByTestId('collectibles-inplace-screen'),
    ).toBeOnTheScreen();

    const dashboard = renderWithProvider(<TradeDashboard />);
    expect(dashboard.queryByTestId('collectibles-inplace-screen')).toBeNull();
    expect(dashboard.getByTestId('trade-dashboard')).toBeOnTheScreen();
  });

  it('switches Predictions in place instead of replacing the stack', () => {
    enterTradingHub('swap');

    const { getByTestId } = renderWithProvider(
      <ContextualFooter homeRouteName={Routes.TRADE_DASHBOARD} />,
    );

    fireEvent.press(getByTestId('trade-hub-tab-predictions'));

    expect(getContextualNavState().tab).toBe('predictions');
    expect(NavigationService.navigation.dispatch).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalledWith(Routes.PREDICT.ROOT);
  });
});
