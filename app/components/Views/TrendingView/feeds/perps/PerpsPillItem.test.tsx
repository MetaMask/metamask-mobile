import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PERPS_EVENT_VALUE } from '@metamask/perps-controller';
import Routes from '../../../../../constants/navigation/Routes';
import PerpsPillItem from './PerpsPillItem';
import type { PerpsFeedItem } from './usePerpsFeed';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

describe('PerpsPillItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
