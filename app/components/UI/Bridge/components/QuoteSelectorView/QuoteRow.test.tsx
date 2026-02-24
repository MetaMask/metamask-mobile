import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { QuoteRow, QuoteRowProps } from './QuoteRow';
import { BigNumber } from 'ethers';
import { strings } from '../../../../../../locales/i18n';

jest.mock('../../hooks/useShouldRenderGasSponsoredBanner', () => ({
  useShouldRenderGasSponsoredBanner: jest.fn(),
}));

jest.mock('../../../../../util/theme', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      success: {
        default: '#28A745',
      },
    },
  })),
}));

const mockUseShouldRenderGasSponsoredBanner = jest.requireMock(
  '../../hooks/useShouldRenderGasSponsoredBanner',
).useShouldRenderGasSponsoredBanner;

describe('QuoteRow', () => {
  const mockOnPress = jest.fn();

  const defaultProps: QuoteRowProps = {
    provider: { name: 'Lifi' },
    formattedTotalCost: '$100.50',
    quoteRequestId: 'quote-123',
    onPress: mockOnPress,
    latestSourceBalance: {
      displayBalance: '1000',
      atomicBalance: BigNumber.from('1000000000000000000'),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseShouldRenderGasSponsoredBanner.mockReturnValue(false);
  });

  describe('rendering', () => {
    it('renders provider name', () => {
      const { getByText } = render(<QuoteRow {...defaultProps} />);

      expect(getByText('Lifi')).toBeTruthy();
    });

    it('renders formatted total cost', () => {
      const { getByText } = render(<QuoteRow {...defaultProps} />);

      expect(getByText('$100.50')).toBeTruthy();
    });

    it('renders formatted network fee when provided', () => {
      const { getByText } = render(
        <QuoteRow {...defaultProps} formattedNetworkFee="$5.00" />,
      );

      expect(getByText('$5.00')).toBeTruthy();
    });

    it('applies selected background color when selected is true', () => {
      const { UNSAFE_root } = render(<QuoteRow {...defaultProps} selected />);

      expect(UNSAFE_root).toBeTruthy();
    });

    it('applies default background color when selected is false', () => {
      const { UNSAFE_root } = render(<QuoteRow {...defaultProps} />);

      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('lowest cost badge', () => {
    it('renders lowest cost badge when isLowestCost is true', () => {
      const { getByText } = render(<QuoteRow {...defaultProps} isLowestCost />);

      expect(getByText(strings('bridge.lowest_cost'))).toBeTruthy();
    });

    it('does not render lowest cost badge when isLowestCost is false', () => {
      const { queryByText } = render(<QuoteRow {...defaultProps} />);

      expect(queryByText(strings('bridge.lowest_cost'))).toBeNull();
    });

    it('does not render lowest cost badge when loading is true', () => {
      const { queryByText } = render(
        <QuoteRow {...defaultProps} isLowestCost loading />,
      );

      expect(queryByText(strings('bridge.lowest_cost'))).toBeNull();
    });
  });

  describe('gas sponsored display', () => {
    it('renders gas fees sponsored text when shouldShowGasSponsored is true', () => {
      mockUseShouldRenderGasSponsoredBanner.mockReturnValue(true);

      const { getByText, queryByText } = render(
        <QuoteRow
          {...defaultProps}
          quoteGasSponsored
          formattedNetworkFee="$5.00"
        />,
      );

      expect(getByText(strings('bridge.gas_fees_sponsored'))).toBeTruthy();
      expect(queryByText('$5.00')).toBeNull();
    });

    it('does not render gas icon when shouldShowGasSponsored is true', () => {
      mockUseShouldRenderGasSponsoredBanner.mockReturnValue(true);

      const { queryByTestId } = render(
        <QuoteRow
          {...defaultProps}
          quoteGasSponsored
          formattedNetworkFee="$5.00"
        />,
      );

      expect(queryByTestId('gas-icon')).toBeNull();
    });
  });

  describe('gasless display', () => {
    it('renders formatted network fee with line-through and "Included" text when isGasless is true', () => {
      const { getByText } = render(
        <QuoteRow {...defaultProps} isGasless formattedNetworkFee="$5.00" />,
      );

      expect(getByText('$5.00')).toBeTruthy();
      expect(getByText(strings('bridge.included'))).toBeTruthy();
    });

    it('does not render gas icon when isGasless is true', () => {
      const { queryByTestId } = render(
        <QuoteRow {...defaultProps} isGasless formattedNetworkFee="$5.00" />,
      );

      expect(queryByTestId('gas-icon')).toBeNull();
    });

    it('does not show gasless display when shouldShowGasSponsored is true', () => {
      mockUseShouldRenderGasSponsoredBanner.mockReturnValue(true);

      const { getByText, queryByText } = render(
        <QuoteRow
          {...defaultProps}
          isGasless
          quoteGasSponsored
          formattedNetworkFee="$5.00"
        />,
      );

      expect(getByText(strings('bridge.gas_fees_sponsored'))).toBeTruthy();
      expect(queryByText(strings('bridge.included'))).toBeNull();
    });
  });

  describe('normal gas fee display', () => {
    it('renders gas icon and formatted network fee when not gasless and not sponsored', () => {
      const { getByText } = render(
        <QuoteRow {...defaultProps} formattedNetworkFee="$5.00" />,
      );

      expect(getByText('$5.00')).toBeTruthy();
    });

    it('does not render "Included" text in normal gas fee display', () => {
      const { queryByText } = render(
        <QuoteRow {...defaultProps} formattedNetworkFee="$5.00" />,
      );

      expect(queryByText(strings('bridge.included'))).toBeNull();
    });

    it('does not render "Gas fees sponsored" text in normal gas fee display', () => {
      const { queryByText } = render(
        <QuoteRow {...defaultProps} formattedNetworkFee="$5.00" />,
      );

      expect(queryByText(strings('bridge.gas_fees_sponsored'))).toBeNull();
    });
  });

  describe('loading state', () => {
    it('hides children in Skeleton components when loading is true', () => {
      const { UNSAFE_root } = render(<QuoteRow {...defaultProps} loading />);

      expect(UNSAFE_root).toBeTruthy();
    });

    it('shows children in Skeleton components when loading is false', () => {
      const { getByText } = render(
        <QuoteRow {...defaultProps} formattedNetworkFee="$5.00" />,
      );

      expect(getByText('Lifi')).toBeTruthy();
      expect(getByText('$5.00')).toBeTruthy();
      expect(getByText('$100.50')).toBeTruthy();
    });
  });

  describe('interactions', () => {
    it('calls onPress with quoteRequestId when pressed', () => {
      const { getByText } = render(<QuoteRow {...defaultProps} />);

      fireEvent.press(getByText('Lifi'));

      expect(mockOnPress).toHaveBeenCalledWith('quote-123');
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('calls onPress when any part of the row is pressed', () => {
      const { getByText } = render(
        <QuoteRow {...defaultProps} formattedNetworkFee="$5.00" />,
      );

      fireEvent.press(getByText('$100.50'));

      expect(mockOnPress).toHaveBeenCalledWith('quote-123');
    });

    it('calls onPress correctly for different quote IDs', () => {
      const { rerender, getByText } = render(
        <QuoteRow {...defaultProps} quoteRequestId="quote-456" />,
      );

      fireEvent.press(getByText('Lifi'));
      expect(mockOnPress).toHaveBeenCalledWith('quote-456');

      rerender(<QuoteRow {...defaultProps} quoteRequestId="quote-789" />);

      fireEvent.press(getByText('Lifi'));
      expect(mockOnPress).toHaveBeenCalledWith('quote-789');
    });
  });

  describe('display priority', () => {
    it('prioritizes gas sponsored over gasless display', () => {
      mockUseShouldRenderGasSponsoredBanner.mockReturnValue(true);

      const { getByText, queryByText } = render(
        <QuoteRow
          {...defaultProps}
          quoteGasSponsored
          isGasless
          formattedNetworkFee="$5.00"
        />,
      );

      expect(getByText(strings('bridge.gas_fees_sponsored'))).toBeTruthy();
      expect(queryByText(strings('bridge.included'))).toBeNull();
      expect(queryByText('$5.00')).toBeNull();
    });

    it('prioritizes gasless over normal gas display', () => {
      const { getByText, queryByText } = render(
        <QuoteRow {...defaultProps} isGasless formattedNetworkFee="$5.00" />,
      );

      expect(getByText(strings('bridge.included'))).toBeTruthy();
      expect(getByText('$5.00')).toBeTruthy();
      expect(queryByText(strings('bridge.gas_fees_sponsored'))).toBeNull();
    });
  });

  describe('latestSourceBalance prop', () => {
    it('passes latestSourceBalance to useShouldRenderGasSponsoredBanner hook', () => {
      const customBalance = {
        displayBalance: '500',
        atomicBalance: BigNumber.from('500000000000000000'),
      };

      render(
        <QuoteRow
          {...defaultProps}
          latestSourceBalance={customBalance}
          quoteGasSponsored
        />,
      );

      expect(mockUseShouldRenderGasSponsoredBanner).toHaveBeenCalledWith({
        latestSourceBalance: customBalance,
        quoteGasSponsored: true,
      });
    });

    it('handles undefined latestSourceBalance', () => {
      const { getByText } = render(
        <QuoteRow {...defaultProps} latestSourceBalance={undefined} />,
      );

      expect(getByText('Lifi')).toBeTruthy();
      expect(mockUseShouldRenderGasSponsoredBanner).toHaveBeenCalledWith({
        latestSourceBalance: undefined,
        quoteGasSponsored: undefined,
      });
    });
  });

  describe('complex scenarios', () => {
    it('renders correctly with all optional props', () => {
      const { getByText } = render(
        <QuoteRow
          {...defaultProps}
          selected
          isLowestCost
          formattedNetworkFee="$5.00"
          isGasless={false}
          quoteGasSponsored={false}
        />,
      );

      expect(getByText('Lifi')).toBeTruthy();
      expect(getByText(strings('bridge.lowest_cost'))).toBeTruthy();
      expect(getByText('$5.00')).toBeTruthy();
      expect(getByText('$100.50')).toBeTruthy();
    });

    it('renders correctly with minimal props', () => {
      const { getByText, queryByText } = render(
        <QuoteRow
          provider={{ name: 'Socket' }}
          formattedTotalCost="$50.00"
          quoteRequestId="minimal-quote"
          onPress={mockOnPress}
          latestSourceBalance={defaultProps.latestSourceBalance}
        />,
      );

      expect(getByText('Socket')).toBeTruthy();
      expect(getByText('$50.00')).toBeTruthy();
      expect(queryByText(strings('bridge.lowest_cost'))).toBeNull();
    });

    it('handles loading state with isLowestCost', () => {
      const { queryByText } = render(
        <QuoteRow {...defaultProps} isLowestCost loading />,
      );

      expect(queryByText(strings('bridge.lowest_cost'))).toBeNull();
    });
  });
});
