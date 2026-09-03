import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import WatchlistDefaultTokenCard from './WatchlistDefaultTokenCard';
import {
  getWatchlistDefaultTokenCardTestId,
  WatchlistDefaultTokenCardTestIds,
} from './WatchlistDefaultTokenCard.testIds';
import type { WatchlistTokenWithBalance } from '../../utils/addBalanceToTokens';

jest.mock('../../../../Trending/components/TrendingTokenLogo', () => {
  const { View } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  const Mock = ({ testID }: { testID?: string }) =>
    ReactActual.createElement(View, { testID: testID ?? 'token-logo' });
  Mock.displayName = 'TrendingTokenLogo';
  return Mock;
});

const makeToken = (
  overrides: Partial<WatchlistTokenWithBalance> = {},
): WatchlistTokenWithBalance => ({
  assetId: 'eip155:1/slip44:60',
  symbol: 'ETH',
  name: 'Ethereum',
  decimals: 18,
  balance: '0',
  isInWallet: false,
  marketData: {
    price: 3000,
    pricePercentChange24h: 4.2,
  },
  ...overrides,
});

describe('WatchlistDefaultTokenCard', () => {
  it('renders symbol and price change', () => {
    const token = makeToken();
    const { getByTestId } = render(
      <WatchlistDefaultTokenCard
        token={token}
        isSelected
        onToggle={jest.fn()}
      />,
    );

    expect(
      getByTestId(`${WatchlistDefaultTokenCardTestIds.SYMBOL}-${token.assetId}`)
        .props.children,
    ).toBe('ETH');
    expect(
      getByTestId(
        `${WatchlistDefaultTokenCardTestIds.PRICE_CHANGE}-${token.assetId}`,
      ).props.children,
    ).toBe('+4.20%');
  });

  it('calls onToggle when the card is pressed', () => {
    const onToggle = jest.fn();
    const token = makeToken();
    const { getByTestId } = render(
      <WatchlistDefaultTokenCard
        token={token}
        isSelected={false}
        onToggle={onToggle}
      />,
    );

    fireEvent.press(
      getByTestId(getWatchlistDefaultTokenCardTestId(token.assetId)),
    );

    expect(onToggle).toHaveBeenCalledWith(String(token.assetId));
  });

  it('calls onToggle when the checkbox is pressed', () => {
    const onToggle = jest.fn();
    const token = makeToken();
    const { getByTestId } = render(
      <WatchlistDefaultTokenCard
        token={token}
        isSelected
        onToggle={onToggle}
      />,
    );

    fireEvent.press(
      getByTestId(
        `${WatchlistDefaultTokenCardTestIds.CHECKBOX}-${token.assetId}`,
      ),
    );

    expect(onToggle).toHaveBeenCalledWith(String(token.assetId));
  });
});
