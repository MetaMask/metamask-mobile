import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PERPS_EVENT_VALUE } from '@metamask/perps-controller';
import Routes from '../../../../../constants/navigation/Routes';
import PerpsPillItem from './PerpsPillItem';
import type { PerpsFeedItem } from '../../types/perpsFeedTypes';
import { createActiveABTestAssignment } from '../../../../../util/analytics/activeABTestAssignments';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../selectors/featureFlags', () => ({
  selectPerpsShowFullAssetNamesFlag: jest.fn(),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const { selectPerpsShowFullAssetNamesFlag } = jest.requireMock(
  '../../selectors/featureFlags',
);
const { useSelector } = jest.requireMock('react-redux');
const mockUseSelector = useSelector as jest.MockedFunction<
  (selector: unknown) => unknown
>;

// Returns the feature-flag value only for the full asset names selector,
// and false for every other selector.
const mockSelectors = (showFullAssetNames: boolean) => {
  mockUseSelector.mockImplementation((selector) =>
    selector === selectPerpsShowFullAssetNamesFlag ? showFullAssetNames : false,
  );
};

describe('PerpsPillItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default to the production default (flag off) so tickers are shown.
    mockSelectors(false);
  });

  const buildItem = (
    change24hPercent: string | null | undefined,
  ): PerpsFeedItem =>
    ({
      market: {
        symbol: 'ETH',
        change24hPercent,
      },
      isWatchlisted: false,
    }) as PerpsFeedItem;

  it('navigates to market details with explore source on press', () => {
    const item = buildItem('1.5');
    const { getByTestId } = render(<PerpsPillItem item={item} />);

    fireEvent.press(getByTestId('perps-market-tile-card-ETH'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_DETAILS,
      params: {
        market: item.market,
        source: PERPS_EVENT_VALUE.SOURCE.EXPLORE,
      },
    });
  });

  it('navigates to market details with home section source when prop is set', () => {
    const item = buildItem('1.5');
    const { getByTestId } = render(
      <PerpsPillItem
        item={item}
        marketDetailsSource={PERPS_EVENT_VALUE.SOURCE.HOME_SECTION}
      />,
    );

    fireEvent.press(getByTestId('perps-market-tile-card-ETH'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_DETAILS,
      params: {
        market: item.market,
        source: PERPS_EVENT_VALUE.SOURCE.HOME_SECTION,
      },
    });
  });

  it('uses custom market details navigation when provided', () => {
    const item = buildItem('1.5');
    const onNavigateToMarketDetails = jest.fn();
    const onCardPress = jest.fn();
    const { getByTestId } = render(
      <PerpsPillItem
        item={item}
        onCardPress={onCardPress}
        onNavigateToMarketDetails={onNavigateToMarketDetails}
      />,
    );

    fireEvent.press(getByTestId('perps-market-tile-card-ETH'));

    expect(onCardPress).toHaveBeenCalledTimes(1);
    expect(onNavigateToMarketDetails).toHaveBeenCalledWith(item.market);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('passes transactionActiveAbTests through to market details params when provided', () => {
    const item = buildItem('1.5');
    const transactionActiveAbTests = [
      createActiveABTestAssignment('flagKeyExample', 'treatment'),
    ];
    const { getByTestId } = render(
      <PerpsPillItem
        item={item}
        marketDetailsSource={PERPS_EVENT_VALUE.SOURCE.HOME_SECTION}
        transactionActiveAbTests={transactionActiveAbTests}
      />,
    );

    fireEvent.press(getByTestId('perps-market-tile-card-ETH'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_DETAILS,
      params: {
        market: item.market,
        source: PERPS_EVENT_VALUE.SOURCE.HOME_SECTION,
        transactionActiveAbTests,
      },
    });
  });

  it('hides change label when change is null, empty, or not a number', () => {
    const { queryByText, rerender } = render(
      <PerpsPillItem item={buildItem(null)} />,
    );
    expect(queryByText(/%/)).toBeNull();

    rerender(<PerpsPillItem item={buildItem('')} />);
    expect(queryByText(/%/)).toBeNull();

    rerender(<PerpsPillItem item={buildItem('x')} />);
    expect(queryByText(/%/)).toBeNull();
  });

  it('renders 0.00% and signed changes for valid numbers', () => {
    const { getByText, rerender } = render(
      <PerpsPillItem item={buildItem('0')} />,
    );
    expect(getByText('0.00%')).toBeTruthy();

    rerender(<PerpsPillItem item={buildItem('3.456')} />);
    expect(getByText('+3.46%')).toBeTruthy();

    rerender(<PerpsPillItem item={buildItem('-0.5')} />);
    expect(getByText('-0.50%')).toBeTruthy();
  });

  describe('full asset name feature flag', () => {
    const buildNamedItem = (): PerpsFeedItem =>
      ({
        market: {
          symbol: 'ETH',
          name: 'Ethereum',
          change24hPercent: '1.5',
        },
        isWatchlisted: false,
      }) as PerpsFeedItem;

    it('shows the ticker symbol when the flag is off', () => {
      mockSelectors(false);

      const { getByText, queryByText } = render(
        <PerpsPillItem item={buildNamedItem()} />,
      );

      expect(getByText('ETH')).toBeTruthy();
      expect(queryByText('Ethereum')).toBeNull();
    });

    it('shows the full asset name when the flag is on', () => {
      mockSelectors(true);

      const { getByText, queryByText } = render(
        <PerpsPillItem item={buildNamedItem()} />,
      );

      expect(getByText('Ethereum')).toBeTruthy();
      expect(queryByText('ETH')).toBeNull();
    });

    it('falls back to the ticker symbol when the flag is on but no name exists', () => {
      mockSelectors(true);

      const { getByText } = render(<PerpsPillItem item={buildItem('1.5')} />);

      expect(getByText('ETH')).toBeTruthy();
    });
  });
});
