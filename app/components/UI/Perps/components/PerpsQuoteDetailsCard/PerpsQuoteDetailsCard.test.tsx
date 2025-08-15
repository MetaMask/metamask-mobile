import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import PerpsQuoteDetailsCard from './PerpsQuoteDetailsCard';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(() => ({ navigate: jest.fn() })),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

// Mock useStyles hook
jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: jest.fn(() => ({
    styles: {
      container: {},
      quoteDetails: {},
      quoteRow: {},
      slippageButton: {},
    },
    theme: {
      colors: {
        primary: {
          default: '#0376C9',
        },
      },
    },
  })),
}));

describe('PerpsQuoteDetailsCard', () => {
  const defaultProps = {
    networkFee: '$0.25',
    rate: '1 USDC = 1 USDC',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all required fields correctly', () => {
      const { getByText } = renderWithProvider(
        <PerpsQuoteDetailsCard {...defaultProps} />,
      );

      expect(getByText('perps.quote.network_fee')).toBeTruthy();
      expect(getByText('$0.25')).toBeTruthy();
      expect(getByText('perps.quote.metamask_fee')).toBeTruthy();
      expect(getByText('$0.00')).toBeTruthy(); // Default metamask fee
      expect(getByText('perps.quote.rate')).toBeTruthy();
      expect(getByText('1 USDC = 1 USDC')).toBeTruthy();
    });

    it('should render with all props provided', () => {
      const props = {
        networkFee: '$0.50',
        estimatedTime: '2-3 minutes',
        rate: '1 ETH = 3000 USDC',
        metamaskFee: '$5.00',
      };

      const { getByText } = renderWithProvider(
        <PerpsQuoteDetailsCard {...props} />,
      );

      expect(getByText('$0.50')).toBeTruthy();
      expect(getByText('perps.quote.estimated_time')).toBeTruthy();
      expect(getByText('2-3 minutes')).toBeTruthy();
      expect(getByText('1 ETH = 3000 USDC')).toBeTruthy();
      expect(getByText('$5.00')).toBeTruthy();
    });

    it('should not render estimated time when not provided', () => {
      const { queryByText } = renderWithProvider(
        <PerpsQuoteDetailsCard {...defaultProps} />,
      );

      expect(queryByText('perps.quote.estimated_time')).toBeNull();
    });

    it('should render estimated time when provided', () => {
      const props = {
        ...defaultProps,
        estimatedTime: '1-2 minutes',
      };

      const { getByText } = renderWithProvider(
        <PerpsQuoteDetailsCard {...props} />,
      );

      expect(getByText('perps.quote.estimated_time')).toBeTruthy();
      expect(getByText('1-2 minutes')).toBeTruthy();
    });

    it('should use default metamask fee when not provided', () => {
      const { getByText } = renderWithProvider(
        <PerpsQuoteDetailsCard {...defaultProps} />,
      );

      expect(getByText('$0.00')).toBeTruthy();
    });

    it('should use custom metamask fee when provided', () => {
      const props = {
        ...defaultProps,
        metamaskFee: '$2.50',
      };

      const { getByText } = renderWithProvider(
        <PerpsQuoteDetailsCard {...props} />,
      );

      expect(getByText('$2.50')).toBeTruthy();
    });
  });

  describe('Component Structure', () => {
    it('should render component without crashing', () => {
      const { getByText } = renderWithProvider(
        <PerpsQuoteDetailsCard {...defaultProps} />,
      );

      expect(getByText('perps.quote.network_fee')).toBeTruthy();
    });
  });

  describe('Props Validation', () => {
    it('should handle empty string values', () => {
      const props = {
        networkFee: '',
        rate: '',
        metamaskFee: '',
      };

      const { getByText } = renderWithProvider(
        <PerpsQuoteDetailsCard {...props} />,
      );

      expect(getByText('perps.quote.network_fee')).toBeTruthy();
      expect(getByText('perps.quote.rate')).toBeTruthy();
      expect(getByText('perps.quote.metamask_fee')).toBeTruthy();
    });

    it('should handle special characters in values', () => {
      const props = {
        networkFee: '$0.25 + fees',
        rate: '1 USDC ≈ 1 USDC',
        metamaskFee: '~$0.00',
      };

      const { getByText } = renderWithProvider(
        <PerpsQuoteDetailsCard {...props} />,
      );

      expect(getByText('$0.25 + fees')).toBeTruthy();
      expect(getByText('1 USDC ≈ 1 USDC')).toBeTruthy();
      expect(getByText('~$0.00')).toBeTruthy();
    });

    it('should handle long text values', () => {
      const props = {
        networkFee: 'Very long network fee description that might wrap',
        rate: 'Long rate description with many details about the conversion',
        estimatedTime: 'This is a very long estimated time description',
      };

      const { getByText } = renderWithProvider(
        <PerpsQuoteDetailsCard {...props} />,
      );

      expect(getByText(props.networkFee)).toBeTruthy();
      expect(getByText(props.rate)).toBeTruthy();
      expect(getByText(props.estimatedTime)).toBeTruthy();
    });
  });

  describe('Integration', () => {
    it('should work with all features together', () => {
      const props = {
        networkFee: '$0.75',
        estimatedTime: '3-4 minutes',
        rate: '1 ETH = 2500 USDC',
        metamaskFee: '$3.50',
      };

      const { getByText } = renderWithProvider(
        <PerpsQuoteDetailsCard {...props} />,
      );

      // Check all values are displayed
      expect(getByText('$0.75')).toBeTruthy();
      expect(getByText('3-4 minutes')).toBeTruthy();
      expect(getByText('1 ETH = 2500 USDC')).toBeTruthy();
      expect(getByText('$3.50')).toBeTruthy();
    });
  });

  describe('Direction Parameter', () => {
    it('should default to deposit direction when not specified', () => {
      const { getByText } = renderWithProvider(
        <PerpsQuoteDetailsCard {...defaultProps} />,
      );

      expect(getByText('perps.quote.network_fee')).toBeTruthy();
    });

    it('should accept deposit direction', () => {
      const props = {
        ...defaultProps,
        direction: 'deposit' as const,
      };

      const { getByText } = renderWithProvider(
        <PerpsQuoteDetailsCard {...props} />,
      );

      expect(getByText('perps.quote.network_fee')).toBeTruthy();
    });

    it('should accept withdrawal direction', () => {
      const props = {
        ...defaultProps,
        direction: 'withdrawal' as const,
      };

      const { getByText } = renderWithProvider(
        <PerpsQuoteDetailsCard {...props} />,
      );

      expect(getByText('perps.quote.network_fee')).toBeTruthy();
    });

    it('should use deposit tooltip when direction is deposit', () => {
      const mockStrings = jest.fn((key: string) => key);
      jest.mocked(jest.requireMock('../../../../../../locales/i18n')).strings =
        mockStrings;

      const props = {
        ...defaultProps,
        direction: 'deposit' as const,
      };

      renderWithProvider(<PerpsQuoteDetailsCard {...props} />);

      // The component should call strings with the deposit-specific tooltip key
      expect(mockStrings).toHaveBeenCalledWith(
        'perps.quote.metamask_fee_tooltip_deposit',
      );
    });

    it('should use withdrawal tooltip when direction is withdrawal', () => {
      const mockStrings = jest.fn((key: string) => key);
      jest.mocked(jest.requireMock('../../../../../../locales/i18n')).strings =
        mockStrings;

      const props = {
        ...defaultProps,
        direction: 'withdrawal' as const,
      };

      renderWithProvider(<PerpsQuoteDetailsCard {...props} />);

      // The component should call strings with the withdrawal-specific tooltip key
      expect(mockStrings).toHaveBeenCalledWith(
        'perps.quote.metamask_fee_tooltip_withdrawal',
      );
    });
  });
});
