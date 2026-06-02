import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import type { TrendingAsset } from '@metamask/assets-controllers';
import CryptoMoversPillItem from './CryptoMoversPillItem';

const mockOnPress = jest.fn();

jest.mock(
  '../../../../UI/Trending/hooks/useTrendingTokenPress/useTrendingTokenPress',
  () => ({
    useTrendingTokenPress: () => ({ onPress: mockOnPress }),
  }),
);

describe('CryptoMoversPillItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseToken = {
    assetId: 'eip155:1/slip44:60',
    symbol: 'ETH',
    priceChangePct: {},
  } as unknown as TrendingAsset;

  it('invokes token press when the pill is pressed', () => {
    const { getByTestId } = render(
      <CryptoMoversPillItem token={baseToken} index={0} />,
    );

    fireEvent.press(getByTestId(`section-pill-${baseToken.assetId}`));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('omits change label when 24h change is missing or not a number', () => {
    const { queryByText, rerender } = render(
      <CryptoMoversPillItem token={baseToken} index={0} />,
    );
    expect(queryByText(/%/)).toBeNull();

    rerender(
      <CryptoMoversPillItem
        token={
          {
            ...baseToken,
            priceChangePct: { h24: 'not-a-number' },
          } as TrendingAsset
        }
        index={0}
      />,
    );
    expect(queryByText(/%/)).toBeNull();
  });

  it('renders zero and signed positive and negative 24h changes', () => {
    const { getByText, rerender } = render(
      <CryptoMoversPillItem
        token={{ ...baseToken, priceChangePct: { h24: '0' } } as TrendingAsset}
        index={0}
      />,
    );
    expect(getByText('0.00%')).toBeTruthy();

    rerender(
      <CryptoMoversPillItem
        token={
          { ...baseToken, priceChangePct: { h24: '2.51' } } as TrendingAsset
        }
        index={0}
      />,
    );
    expect(getByText('+2.51%')).toBeTruthy();

    rerender(
      <CryptoMoversPillItem
        token={
          { ...baseToken, priceChangePct: { h24: '-1.2' } } as TrendingAsset
        }
        index={0}
      />,
    );
    expect(getByText('-1.20%')).toBeTruthy();
  });
});
