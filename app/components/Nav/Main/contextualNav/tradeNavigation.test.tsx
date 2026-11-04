import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { StackActions } from '@react-navigation/native';

import renderWithProvider from '../../../../util/test/renderWithProvider';
import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../../core/NavigationService';
import TradeDashboard from './TradeDashboard';
import TradeFeatureRoot from './TradeFeatureRoot';
import TradeHubFooter from './TradeHubFooter';
import {
  enterTradingHub,
  exitContextualSection,
  getContextualNavState,
} from './contextualSection';

const mockNavigate = jest.fn();
const mockDispatch = jest.fn();

jest.mock('../../../../util/haptics');
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      dispatch: mockDispatch,
    }),
  };
});
jest.mock('../../../../core/NavigationService', () => ({
  __esModule: true,
  default: { navigation: { navigate: jest.fn(), dispatch: jest.fn() } },
}));
jest.mock('../../../UI/Perps', () => ({
  selectPerpsEnabledFlag: () => true,
}));
jest.mock('../../../UI/Perps/routes', () => ({
  __esModule: true,
  default: () => null,
}));

describe('trade navigation', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockDispatch.mockClear();
    exitContextualSection();
    (NavigationService.navigation.dispatch as jest.Mock).mockClear();
  });

  it('opens Perps from the Trade dashboard without landing on Swap', () => {
    const { getByTestId } = renderWithProvider(<TradeDashboard />);

    fireEvent.press(getByTestId('trade-dashboard-perps'));

    expect(getContextualNavState()).toEqual({
      section: 'trading',
      tab: 'perps',
    });
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT);
    expect(mockNavigate).not.toHaveBeenCalledWith(Routes.BRIDGE.ROOT);
  });

  it('opens Collectibles on Popular from the Trade dashboard', () => {
    const { getByTestId } = renderWithProvider(<TradeDashboard />);

    fireEvent.press(getByTestId('trade-dashboard-collectibles'));

    expect(getContextualNavState()).toEqual({
      section: 'collectibles',
      tab: 'popular',
    });
    expect(mockNavigate).toHaveBeenCalledWith(Routes.COLLECTIBLES_VIEW);
  });

  it('preselects the current hub and replaces the screen for another way to trade', () => {
    enterTradingHub('perps');
    const onHomePress = jest.fn();
    const onHubPress = jest.fn();
    const { getByTestId } = renderWithProvider(
      <TradeHubFooter
        active="perps"
        onHomePress={onHomePress}
        onHubPress={onHubPress}
      />,
    );

    expect(getByTestId('trade-hub-tab-perps').props.accessibilityState).toEqual(
      { selected: true },
    );
    expect(getByTestId('trade-hub-tab-swap').props.accessibilityState).toEqual({
      selected: false,
    });
    expect(getByTestId('trade-hub-tab-perps').props.accessibilityLabel).toBe(
      'Perps',
    );
    expect(
      getByTestId('trade-hub-tab-predictions').props.accessibilityLabel,
    ).toBe('Predictions');

    fireEvent.press(getByTestId('trade-hub-tab-predictions'));

    expect(onHubPress).toHaveBeenCalledWith('predictions');
    expect(onHomePress).not.toHaveBeenCalled();
  });

  it('shows the trading footer on the Perps root and Home leaves the hub', () => {
    enterTradingHub('perps');
    const { getByTestId } = renderWithProvider(
      <TradeFeatureRoot hub="perps">{null}</TradeFeatureRoot>,
    );

    expect(getByTestId('trade-feature-perps')).toBeOnTheScreen();
    expect(getByTestId('trade-hub-tab-perps').props.accessibilityState).toEqual(
      { selected: true },
    );

    fireEvent.press(getByTestId('trade-hub-tab-home'));

    expect(getContextualNavState().section).toBeNull();
    expect(mockDispatch).toHaveBeenCalledWith(
      StackActions.popTo(Routes.HOME_TABS, {
        screen: Routes.WALLET.HOME,
        params: { screen: Routes.WALLET_VIEW },
      }),
    );
  });

  it('does not show hub sub-section tabs on the Perps root', () => {
    enterTradingHub('perps');
    const { queryByTestId } = renderWithProvider(
      <TradeFeatureRoot hub="perps">{null}</TradeFeatureRoot>,
    );

    expect(queryByTestId('trade-hub-tab-live')).toBeNull();
    expect(queryByTestId('contextual-perps-tab-explore')).toBeNull();
    expect(queryByTestId('trade-hub-tab-swap')).toBeOnTheScreen();
  });
});
