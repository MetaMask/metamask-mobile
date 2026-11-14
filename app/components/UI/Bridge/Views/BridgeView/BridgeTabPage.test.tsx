import React from 'react';
import { render } from '@testing-library/react-native';
import { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';
import BridgeTabPage from './BridgeTabPage';
import { BridgeTabKey } from './BridgeView.constants';
import { BridgeViewSelectorsIDs } from './BridgeView.testIds';

const mockBridgeMarketView = jest.fn((_props: unknown) => null);
const mockBridgeLimitOrderView = jest.fn((_props: unknown) => null);
const mockBridgeRecurringBuyView = jest.fn((_props: unknown) => null);

jest.mock(
  './BridgeMarketView',
  () => (props: unknown) => mockBridgeMarketView(props),
);
jest.mock(
  './BridgeLimitOrderView',
  () => (props: unknown) => mockBridgeLimitOrderView(props),
);
jest.mock(
  './BridgeRecurringBuyView',
  () => (props: unknown) => mockBridgeRecurringBuyView(props),
);

const location = MetaMetricsSwapsEventSource.TokenView;

const skeletonTestId = (tab: BridgeTabKey) =>
  `${BridgeViewSelectorsIDs.TAB_PAGE_SKELETON}-${tab}`;

describe('BridgeTabPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    [BridgeTabKey.Market, mockBridgeMarketView],
    [BridgeTabKey.Limit, mockBridgeLimitOrderView],
    [BridgeTabKey.Recurring, mockBridgeRecurringBuyView],
  ])('renders the %s view with the location when mounted', (tab, view) => {
    const { queryByTestId } = render(
      <BridgeTabPage tab={tab} isMounted location={location} />,
    );

    expect(view).toHaveBeenCalledWith({ location });
    expect(queryByTestId(skeletonTestId(tab))).toBeNull();
  });

  it('renders the skeleton instead of the view when not mounted', () => {
    const { getByTestId } = render(
      <BridgeTabPage
        tab={BridgeTabKey.Limit}
        isMounted={false}
        location={location}
      />,
    );

    expect(getByTestId(skeletonTestId(BridgeTabKey.Limit))).toBeOnTheScreen();
    expect(mockBridgeLimitOrderView).not.toHaveBeenCalled();
  });

  it('only renders the view for its own tab', () => {
    render(
      <BridgeTabPage tab={BridgeTabKey.Market} isMounted location={location} />,
    );

    expect(mockBridgeLimitOrderView).not.toHaveBeenCalled();
    expect(mockBridgeRecurringBuyView).not.toHaveBeenCalled();
  });
});
