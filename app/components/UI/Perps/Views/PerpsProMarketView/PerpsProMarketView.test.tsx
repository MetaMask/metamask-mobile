import React from 'react';
import PerpsProMarketView from './';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { PerpsProMarketViewSelectorsIDs } from '../../Perps.testIds';

const mockRouteParams: { market?: { symbol: string } } = {
  market: { symbol: 'BTC' },
};

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useRoute: () => ({ params: mockRouteParams }),
  };
});

const renderView = () =>
  renderWithProvider(<PerpsProMarketView />, {
    state: { engine: { backgroundState } },
  });

describe('PerpsProMarketView', () => {
  it('renders the container and scroll view', () => {
    const { getByTestId } = renderView();

    expect(getByTestId(PerpsProMarketViewSelectorsIDs.CONTAINER)).toBeTruthy();
    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.SCROLL_VIEW),
    ).toBeTruthy();
  });

  it('renders every layout panel placeholder', () => {
    const { getByTestId } = renderView();

    expect(getByTestId(PerpsProMarketViewSelectorsIDs.HEADER)).toBeTruthy();
    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.CHART_PANEL),
    ).toBeTruthy();
    expect(getByTestId(PerpsProMarketViewSelectorsIDs.STATS_BAR)).toBeTruthy();
    expect(getByTestId(PerpsProMarketViewSelectorsIDs.LAYOUT)).toBeTruthy();
    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.ORDER_FORM_PANEL),
    ).toBeTruthy();
    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.ORDER_BOOK_PANEL),
    ).toBeTruthy();
    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.POSITIONS_PANEL),
    ).toBeTruthy();
  });

  it('shows the asset symbol from route params in the header', () => {
    const { getByText } = renderView();

    expect(getByText('BTC')).toBeTruthy();
  });
});
