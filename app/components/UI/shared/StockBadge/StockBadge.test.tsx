import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import StockBadge from './StockBadge';
import { useRWAToken } from '../../Bridge/hooks/useRWAToken';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { BridgeToken } from '../../Bridge/types';

// Mock dependencies
const mockStyles = {
  stockBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 4,
  },
};

const tokenWithRwaData: BridgeToken = {
  address: '0x123',
  symbol: 'TEST',
  decimals: 18,
  chainId: '0x1',
  rwaData: {
    instrumentType: 'stock',
    market: { nextOpen: '2024-01-01', nextClose: '2024-01-02' },
  },
};

jest.mock('../../../../component-library/hooks', () => ({
  useStyles: jest.fn(() => ({ styles: mockStyles })),
}));

jest.mock('../../Bridge/hooks/useRWAToken');

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'token.stock': 'Stock',
    };
    return translations[key] || key;
  }),
}));

const mockUseRWAToken = useRWAToken as jest.MockedFunction<typeof useRWAToken>;

describe('StockBadge', () => {
  const mockIsTokenTradingOpen = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRWAToken.mockReturnValue({
      isStockToken: jest.fn(() => true),
      isTokenTradingOpen: mockIsTokenTradingOpen,
    });
  });

  describe('rendering', () => {
    it('renders badge with "Stock" text', async () => {
      mockIsTokenTradingOpen.mockReturnValue(true);

      const { getByText } = render(<StockBadge />);

      await waitFor(() => {
        expect(getByText('Stock')).toBeOnTheScreen();
      });
    });

    it('renders badge container', async () => {
      mockIsTokenTradingOpen.mockReturnValue(true);

      const { getByText } = render(<StockBadge />);

      await waitFor(() => {
        const textElement = getByText('Stock');
        expect(textElement).toBeOnTheScreen();
      });
    });
  });

  describe('clock icon visibility', () => {
    it('displays clock icon when trading is NOT open', async () => {
      mockIsTokenTradingOpen.mockReturnValue(false);

      const { UNSAFE_queryByProps } = render(
        <StockBadge
          token={{
            ...tokenWithRwaData,
            rwaData: {
              ...tokenWithRwaData.rwaData,
              market: { nextOpen: '2024-01-02', nextClose: '2024-01-01' },
            },
          }}
        />,
      );

      await waitFor(() => {
        const clockIcon = UNSAFE_queryByProps({
          name: IconName.ClockHalfDotted,
        });
        expect(clockIcon).toBeTruthy();
      });
    });

    it('does NOT display clock icon when trading IS open', async () => {
      mockIsTokenTradingOpen.mockReturnValue(true);

      const { UNSAFE_queryByProps } = render(
        <StockBadge token={tokenWithRwaData} />,
      );

      await waitFor(() => {
        const clockIcon = UNSAFE_queryByProps({
          name: IconName.ClockHalfDotted,
        });
        expect(clockIcon).toBeNull();
      });
    });

    it('does NOT display clock icon when no token is provided', async () => {
      const { UNSAFE_queryByProps } = render(<StockBadge />);

      await waitFor(() => {
        const clockIcon = UNSAFE_queryByProps({
          name: IconName.ClockHalfDotted,
        });
        expect(clockIcon).toBeNull();
      });
    });
  });

  describe('token handling', () => {
    it('calls isTokenTradingOpen', async () => {
      mockIsTokenTradingOpen.mockReturnValue(true);

      render(<StockBadge token={tokenWithRwaData} />);

      await waitFor(() => {
        expect(mockIsTokenTradingOpen).toHaveBeenCalledWith(tokenWithRwaData);
      });
    });
  });

  describe('trading status updates', () => {
    it('updates icon visibility when trading status changes to closed', async () => {
      mockIsTokenTradingOpen.mockReturnValue(false);

      const { UNSAFE_queryByProps } = render(
        <StockBadge
          token={
            {
              ...tokenWithRwaData,
              rwaData: {
                ...tokenWithRwaData.rwaData,
                market: { nextOpen: '2024-01-02', nextClose: '2024-01-01' },
              },
            } as BridgeToken
          }
        />,
      );

      await waitFor(() => {
        const clockIcon = UNSAFE_queryByProps({
          name: IconName.ClockHalfDotted,
        });
        expect(clockIcon).toBeTruthy();
      });
    });

    it('updates icon visibility when trading status changes to open', async () => {
      mockIsTokenTradingOpen.mockReturnValue(true);

      const { UNSAFE_queryByProps, getByText } = render(
        <StockBadge token={tokenWithRwaData} />,
      );

      await waitFor(() => {
        expect(getByText('Stock')).toBeOnTheScreen();
        const clockIcon = UNSAFE_queryByProps({
          name: IconName.ClockHalfDotted,
        });
        expect(clockIcon).toBeNull();
      });
    });
  });
});
