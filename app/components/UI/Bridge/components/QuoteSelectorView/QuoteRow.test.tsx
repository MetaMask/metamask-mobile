import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { QuoteRow, QuoteRowProps } from './QuoteRow';
import { strings } from '../../../../../../locales/i18n';
import { BridgeToken } from '../../types';
import { CHAIN_IDS } from '@metamask/transaction-controller';

jest.mock('../../../../../util/theme', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      success: { default: '#28A745' },
    },
  })),
}));

const mockDestToken: BridgeToken = {
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  symbol: 'USDC',
  decimals: 6,
  chainId: CHAIN_IDS.MAINNET,
};

jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  return {
    ...actual,
    useSelector: jest.fn((selector) => {
      const mockState = {
        bridge: { destToken: mockDestToken },
      };
      try {
        return selector(mockState);
      } catch {
        return null;
      }
    }),
  };
});

jest.mock('../../hooks/useDisplayCurrencyValue', () => ({
  useDisplayCurrencyValue: jest.fn(() => '$50.00'),
}));

import { useSelector } from 'react-redux';
import { useDisplayCurrencyValue } from '../../hooks/useDisplayCurrencyValue';

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseDisplayCurrencyValue =
  useDisplayCurrencyValue as jest.MockedFunction<
    typeof useDisplayCurrencyValue
  >;

describe('QuoteRow', () => {
  const mockOnPress = jest.fn();

  const defaultProps: QuoteRowProps = {
    provider: { name: 'Lifi' },
    formattedTotalCost: '$100.50',
    quoteRequestId: 'quote-123',
    onPress: mockOnPress,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDisplayCurrencyValue.mockReturnValue('$50.00');
    mockUseSelector.mockImplementation((selector) => {
      const mockState = { bridge: { destToken: mockDestToken } };
      try {
        return selector(mockState);
      } catch {
        return null;
      }
    });
  });

  describe('rendering', () => {
    it('renders provider name', () => {
      // Act
      const { getByText } = render(<QuoteRow {...defaultProps} />);

      // Assert
      expect(getByText('Lifi')).toBeTruthy();
    });

    it('renders formatted total cost with label', () => {
      // Act
      const { getByText } = render(<QuoteRow {...defaultProps} />);

      // Assert
      expect(
        getByText(`${strings('bridge.total_cost')}: $100.50`),
      ).toBeTruthy();
    });

    it('renders receive amount and destToken symbol', () => {
      // Act
      const { getByText } = render(
        <QuoteRow {...defaultProps} receiveAmount="500" />,
      );

      // Assert
      expect(getByText(/500.*USDC/)).toBeTruthy();
    });

    it('renders fiat currency value with tilde prefix', () => {
      // Arrange
      mockUseDisplayCurrencyValue.mockReturnValue('$50.00');

      // Act
      const { getByText } = render(
        <QuoteRow {...defaultProps} receiveAmount="500" />,
      );

      // Assert
      expect(getByText('~ $50.00')).toBeTruthy();
    });

    it('passes receiveAmount and destToken to useDisplayCurrencyValue', () => {
      // Act
      render(<QuoteRow {...defaultProps} receiveAmount="500" />);

      // Assert
      expect(mockUseDisplayCurrencyValue).toHaveBeenCalledWith(
        '500',
        mockDestToken,
      );
    });

    it('passes undefined receiveAmount to useDisplayCurrencyValue when not provided', () => {
      // Act
      render(<QuoteRow {...defaultProps} />);

      // Assert
      expect(mockUseDisplayCurrencyValue).toHaveBeenCalledWith(
        undefined,
        mockDestToken,
      );
    });
  });

  describe('receive amount formatting', () => {
    it('formats large receive amounts with locale separators', () => {
      // Act
      const { getByText } = render(
        <QuoteRow {...defaultProps} receiveAmount="1000.5" />,
      );

      // Assert — formatAmountWithLocaleSeparators('1000.5') → '~ 1,000.5 USDC' in en locale
      expect(getByText('~ 1,000.5 USDC')).toBeTruthy();
    });

    it('does not format when receiveAmount is 0', () => {
      // Act
      const { getByText } = render(
        <QuoteRow {...defaultProps} receiveAmount="0" />,
      );

      // Assert — raw amount returned when value is 0, tilde prefix still present
      expect(getByText('~ 0 USDC')).toBeTruthy();
    });

    it('does not format when destToken is undefined', () => {
      // Arrange
      mockUseSelector.mockReturnValue(undefined);

      // Act
      const { queryByText, getByText } = render(
        <QuoteRow {...defaultProps} receiveAmount="1000" />,
      );

      // Assert — raw amount rendered without symbol; no formatted grouping
      expect(queryByText('1,000')).toBeNull();
      expect(getByText(/~ 1000/)).toBeTruthy();
    });

    it('renders nothing for destToken symbol when destToken is undefined', () => {
      // Arrange
      mockUseSelector.mockReturnValue(undefined);

      // Act
      const { queryByText } = render(
        <QuoteRow {...defaultProps} receiveAmount="500" />,
      );

      // Assert — no USDC symbol rendered
      expect(queryByText(/USDC/)).toBeNull();
    });
  });

  describe('lowest cost badge', () => {
    it('renders lowest cost badge when isLowestCost is true', () => {
      // Act
      const { getByText } = render(<QuoteRow {...defaultProps} isLowestCost />);

      // Assert
      expect(getByText(strings('bridge.lowest_cost'))).toBeTruthy();
    });

    it('does not render lowest cost badge when isLowestCost is false', () => {
      // Act
      const { queryByText } = render(<QuoteRow {...defaultProps} />);

      // Assert
      expect(queryByText(strings('bridge.lowest_cost'))).toBeNull();
    });

    it('does not render lowest cost badge when loading is true even if isLowestCost', () => {
      // Act
      const { queryByText } = render(
        <QuoteRow {...defaultProps} isLowestCost loading />,
      );

      // Assert
      expect(queryByText(strings('bridge.lowest_cost'))).toBeNull();
    });
  });

  describe('loading state', () => {
    it('hides provider name via Skeleton when loading is true', () => {
      // Act
      const { queryByText } = render(<QuoteRow {...defaultProps} loading />);

      // Assert — Skeleton with hideChildren hides text content
      expect(queryByText('Lifi')).toBeNull();
    });

    it('hides total cost via Skeleton when loading is true', () => {
      // Act
      const { queryByText } = render(<QuoteRow {...defaultProps} loading />);

      // Assert
      expect(
        queryByText(`${strings('bridge.total_cost')}: $100.50`),
      ).toBeNull();
    });

    it('shows provider name and cost when loading is false', () => {
      // Act
      const { getByText } = render(<QuoteRow {...defaultProps} />);

      // Assert
      expect(getByText('Lifi')).toBeTruthy();
      expect(
        getByText(`${strings('bridge.total_cost')}: $100.50`),
      ).toBeTruthy();
    });
  });

  describe('interactions', () => {
    it('calls onPress with quoteRequestId when pressed', () => {
      // Act
      const { getByText } = render(<QuoteRow {...defaultProps} />);
      fireEvent.press(getByText('Lifi'));

      // Assert
      expect(mockOnPress).toHaveBeenCalledWith('quote-123');
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('calls onPress when pressing the total cost text', () => {
      // Act
      const { getByText } = render(<QuoteRow {...defaultProps} />);
      fireEvent.press(getByText(`${strings('bridge.total_cost')}: $100.50`));

      // Assert
      expect(mockOnPress).toHaveBeenCalledWith('quote-123');
    });

    it('calls onPress with correct id for different quoteRequestId values', () => {
      // Arrange
      const { rerender, getByText } = render(
        <QuoteRow {...defaultProps} quoteRequestId="quote-456" />,
      );

      // Act
      fireEvent.press(getByText('Lifi'));
      expect(mockOnPress).toHaveBeenCalledWith('quote-456');

      rerender(<QuoteRow {...defaultProps} quoteRequestId="quote-789" />);
      fireEvent.press(getByText('Lifi'));

      // Assert
      expect(mockOnPress).toHaveBeenCalledWith('quote-789');
    });
  });

  describe('selected state', () => {
    it('renders correctly when selected is true', () => {
      // Act
      const { UNSAFE_root } = render(<QuoteRow {...defaultProps} selected />);

      // Assert
      expect(UNSAFE_root).toBeTruthy();
    });

    it('renders correctly when selected is false', () => {
      // Act
      const { UNSAFE_root } = render(
        <QuoteRow {...defaultProps} selected={false} />,
      );

      // Assert
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('complex scenarios', () => {
    it('renders correctly with all props provided', () => {
      // Arrange
      mockUseDisplayCurrencyValue.mockReturnValue('$25.00');

      // Act
      const { getByText } = render(
        <QuoteRow
          {...defaultProps}
          selected
          isLowestCost
          receiveAmount="250.5"
        />,
      );

      // Assert
      expect(getByText('Lifi')).toBeTruthy();
      expect(
        getByText(`${strings('bridge.total_cost')}: $100.50`),
      ).toBeTruthy();
      expect(getByText(strings('bridge.lowest_cost'))).toBeTruthy();
      expect(getByText('~ 250.5 USDC')).toBeTruthy();
      expect(getByText('~ $25.00')).toBeTruthy();
    });

    it('renders correctly with minimal props', () => {
      // Act
      const { getByText, queryByText } = render(
        <QuoteRow
          provider={{ name: 'Socket' }}
          formattedTotalCost="$50.00"
          quoteRequestId="minimal-quote"
          onPress={mockOnPress}
        />,
      );

      // Assert
      expect(getByText('Socket')).toBeTruthy();
      expect(getByText(`${strings('bridge.total_cost')}: $50.00`)).toBeTruthy();
      expect(queryByText(strings('bridge.lowest_cost'))).toBeNull();
    });
  });
});
