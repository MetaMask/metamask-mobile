import React from 'react';
import { within } from '@testing-library/react-native';
import PerpsProMarketView from './';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import {
  PerpsProMarketViewSelectorsIDs,
  PerpsProOrderFormSelectorsIDs,
} from '../../Perps.testIds';

interface MockRouteParams {
  market?: { symbol: string };
}

let mockRouteParams: MockRouteParams | undefined = {
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
  beforeEach(() => {
    mockRouteParams = { market: { symbol: 'BTC' } };
  });

  it.each([
    ['params', undefined],
    ['market', {}],
    ['symbol', { market: { symbol: '' } }],
  ] as const)(
    'renders the error state when route %s are invalid',
    (_missingField, params) => {
      mockRouteParams = params;

      const { getByTestId, queryByTestId, getByText } = renderView();

      expect(
        getByTestId(PerpsProMarketViewSelectorsIDs.ERROR),
      ).toBeOnTheScreen();
      expect(
        getByText('Market data not found. Please go back and try again.'),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(PerpsProMarketViewSelectorsIDs.CONTAINER),
      ).not.toBeOnTheScreen();
    },
  );

  it('renders the screen inside every safe-area edge', () => {
    const { getByTestId } = renderView();

    expect(getByTestId(PerpsProMarketViewSelectorsIDs.CONTAINER)).toHaveProp(
      'edges',
      ['top', 'bottom', 'left', 'right'],
    );
  });

  it('renders every top-level scaffold slot', () => {
    const { getByTestId } = renderView();

    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.HEADER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.MARKET_SUMMARY),
    ).toBeOnTheScreen();
    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.CHART_PANEL),
    ).toBeOnTheScreen();
    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.STATS_BAR),
    ).toBeOnTheScreen();
    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.LAYOUT),
    ).toBeOnTheScreen();
    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.ORDER_FORM_PANEL),
    ).toBeOnTheScreen();
    expect(
      getByTestId(PerpsProOrderFormSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.ORDER_BOOK_PANEL),
    ).toBeOnTheScreen();
    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.POSITIONS_PANEL),
    ).toBeOnTheScreen();
  });

  it('dismisses the native keyboard interactively without swallowing taps', () => {
    const { getByTestId } = renderView();

    expect(getByTestId(PerpsProMarketViewSelectorsIDs.SCROLL_VIEW)).toHaveProp(
      'keyboardDismissMode',
      'interactive',
    );
    expect(getByTestId(PerpsProMarketViewSelectorsIDs.SCROLL_VIEW)).toHaveProp(
      'keyboardShouldPersistTaps',
      'handled',
    );
  });

  it('keeps the fixture Place Order action disabled until wiring lands', () => {
    const { getByTestId } = renderView();

    expect(
      getByTestId(PerpsProOrderFormSelectorsIDs.PLACE_ORDER_BUTTON),
    ).toBeDisabled();
  });

  it('renders the Pro summary and available balance copy from Figma', () => {
    const { getByTestId } = renderView();

    expect(
      getByTestId(PerpsProOrderFormSelectorsIDs.SUMMARY_LIQUIDATION),
    ).toHaveTextContent(/Est Liquidation/);
    expect(
      getByTestId(PerpsProOrderFormSelectorsIDs.AVAILABLE_BALANCE),
    ).toHaveTextContent('-- available');
  });

  it('keeps the header fixed while the market summary scrolls', () => {
    const { getByTestId } = renderView();

    const scrollView = getByTestId(PerpsProMarketViewSelectorsIDs.SCROLL_VIEW);

    expect(
      within(scrollView).queryByTestId(PerpsProMarketViewSelectorsIDs.HEADER),
    ).not.toBeOnTheScreen();
    expect(
      within(scrollView).getByTestId(
        PerpsProMarketViewSelectorsIDs.MARKET_SUMMARY,
      ),
    ).toBeOnTheScreen();
  });

  it('shows the asset symbol from route params in the header', () => {
    const { getByTestId } = renderView();

    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.HEADER_SYMBOL),
    ).toHaveTextContent(/^BTC$/);
  });

  it('removes the HIP-3 dex prefix from the header symbol', () => {
    mockRouteParams = { market: { symbol: 'xyz:TSLA' } };

    const { getByTestId } = renderView();

    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.HEADER_SYMBOL),
    ).toHaveTextContent(/^TSLA$/);
  });

  it('uses the Figma shell heights', () => {
    const { getByTestId } = renderView();

    expect(getByTestId(PerpsProMarketViewSelectorsIDs.HEADER)).toHaveStyle({
      height: 64,
    });
    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.MARKET_SUMMARY),
    ).toHaveStyle({ height: 76 });
    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.CHART_CONTENT),
    ).toHaveStyle({ height: 344 });
  });
});
