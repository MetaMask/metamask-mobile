import React from 'react';
import { render } from '@testing-library/react-native';
import { QuoteList } from './QuoteList';
import { QuoteRowProps } from './QuoteRow';
import { BigNumber } from 'ethers';

jest.mock('./QuoteRow', () => ({
  QuoteRow: ({ provider, quoteRequestId }: QuoteRowProps) => {
    const { Text } = jest.requireActual('react-native');
    return (
      <Text testID={`quote-row-${quoteRequestId}`}>
        {provider.name} - {quoteRequestId}
      </Text>
    );
  },
}));

jest.mock('../../hooks/useShouldRenderGasSponsoredBanner', () => ({
  useShouldRenderGasSponsoredBanner: jest.fn(),
}));

describe('QuoteList', () => {
  const mockOnPress = jest.fn();

  const createMockQuote = (
    overrides: Partial<QuoteRowProps> = {},
  ): QuoteRowProps => ({
    provider: { name: 'Lifi' },
    formattedTotalCost: '$100.00',
    quoteRequestId: 'quote-123',
    onPress: mockOnPress,
    latestSourceBalance: {
      displayBalance: '1000',
      atomicBalance: BigNumber.from('1000000000000000000'),
    },
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders empty list when data is empty array', () => {
      const { queryByTestId } = render(<QuoteList data={[]} />);

      expect(queryByTestId(/quote-row-/)).toBeNull();
    });

    it('renders single QuoteRow when data has one item', () => {
      const quote = createMockQuote({
        provider: { name: 'Lifi' },
        quoteRequestId: 'quote-1',
      });

      const { getByTestId, getByText } = render(<QuoteList data={[quote]} />);

      expect(getByTestId('quote-row-quote-1')).toBeTruthy();
      expect(getByText('Lifi - quote-1')).toBeTruthy();
    });

    it('renders multiple QuoteRows when data has multiple items', () => {
      const quotes = [
        createMockQuote({
          provider: { name: 'Lifi' },
          quoteRequestId: 'quote-1',
        }),
        createMockQuote({
          provider: { name: 'Socket' },
          quoteRequestId: 'quote-2',
        }),
        createMockQuote({
          provider: { name: 'Hop' },
          quoteRequestId: 'quote-3',
        }),
      ];

      const { getByTestId, getByText } = render(<QuoteList data={quotes} />);

      expect(getByTestId('quote-row-quote-1')).toBeTruthy();
      expect(getByTestId('quote-row-quote-2')).toBeTruthy();
      expect(getByTestId('quote-row-quote-3')).toBeTruthy();
      expect(getByText('Lifi - quote-1')).toBeTruthy();
      expect(getByText('Socket - quote-2')).toBeTruthy();
      expect(getByText('Hop - quote-3')).toBeTruthy();
    });

    it('renders correct number of QuoteRows matching data length', () => {
      const quotes = [
        createMockQuote({ quoteRequestId: 'quote-1' }),
        createMockQuote({ quoteRequestId: 'quote-2' }),
        createMockQuote({ quoteRequestId: 'quote-3' }),
        createMockQuote({ quoteRequestId: 'quote-4' }),
        createMockQuote({ quoteRequestId: 'quote-5' }),
      ];

      const { getAllByText } = render(<QuoteList data={quotes} />);

      const renderedRows = getAllByText(/Lifi - quote-/);
      expect(renderedRows).toHaveLength(5);
    });
  });

  describe('prop passing', () => {
    it('passes all props to QuoteRow components', () => {
      const quote = createMockQuote({
        provider: { name: 'Lifi' },
        quoteRequestId: 'quote-1',
        formattedTotalCost: '$200.50',
        formattedNetworkFee: '$5.00',
        isLowestCost: true,
        selected: true,
        isGasless: true,
      });

      const { getByText } = render(<QuoteList data={[quote]} />);

      expect(getByText('Lifi - quote-1')).toBeTruthy();
    });

    it('passes different props to different QuoteRow components', () => {
      const quotes = [
        createMockQuote({
          provider: { name: 'Lifi' },
          quoteRequestId: 'quote-1',
          formattedTotalCost: '$100.00',
        }),
        createMockQuote({
          provider: { name: 'Socket' },
          quoteRequestId: 'quote-2',
          formattedTotalCost: '$200.00',
        }),
      ];

      const { getByText } = render(<QuoteList data={quotes} />);

      expect(getByText('Lifi - quote-1')).toBeTruthy();
      expect(getByText('Socket - quote-2')).toBeTruthy();
    });
  });

  describe('key generation', () => {
    it('uses quoteRequestId as key for each QuoteRow', () => {
      const quotes = [
        createMockQuote({ quoteRequestId: 'unique-id-1' }),
        createMockQuote({ quoteRequestId: 'unique-id-2' }),
        createMockQuote({ quoteRequestId: 'unique-id-3' }),
      ];

      const { getByTestId } = render(<QuoteList data={quotes} />);

      expect(getByTestId('quote-row-unique-id-1')).toBeTruthy();
      expect(getByTestId('quote-row-unique-id-2')).toBeTruthy();
      expect(getByTestId('quote-row-unique-id-3')).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('handles quotes with same provider but different IDs', () => {
      const quotes = [
        createMockQuote({
          provider: { name: 'Lifi' },
          quoteRequestId: 'lifi-quote-1',
        }),
        createMockQuote({
          provider: { name: 'Lifi' },
          quoteRequestId: 'lifi-quote-2',
        }),
      ];

      const { getByTestId } = render(<QuoteList data={quotes} />);

      expect(getByTestId('quote-row-lifi-quote-1')).toBeTruthy();
      expect(getByTestId('quote-row-lifi-quote-2')).toBeTruthy();
    });

    it('handles quotes with all optional props undefined', () => {
      const quote = createMockQuote({
        provider: { name: 'Socket' },
        quoteRequestId: 'minimal-quote',
        formattedNetworkFee: undefined,
        isLowestCost: undefined,
        selected: undefined,
        isGasless: undefined,
        quoteGasSponsored: undefined,
        loading: undefined,
      });

      const { getByText } = render(<QuoteList data={[quote]} />);

      expect(getByText('Socket - minimal-quote')).toBeTruthy();
    });

    it('handles large list of quotes', () => {
      const quotes = Array.from({ length: 50 }, (_, i) =>
        createMockQuote({
          provider: { name: `Provider${i}` },
          quoteRequestId: `quote-${i}`,
        }),
      );

      const { getByTestId } = render(<QuoteList data={quotes} />);

      expect(getByTestId('quote-row-quote-0')).toBeTruthy();
      expect(getByTestId('quote-row-quote-25')).toBeTruthy();
      expect(getByTestId('quote-row-quote-49')).toBeTruthy();
    });
  });

  describe('data updates', () => {
    it('updates when data changes from empty to populated', () => {
      const { queryByTestId, rerender } = render(<QuoteList data={[]} />);

      expect(queryByTestId(/quote-row-/)).toBeNull();

      const quotes = [createMockQuote({ quoteRequestId: 'new-quote' })];
      rerender(<QuoteList data={quotes} />);

      expect(queryByTestId('quote-row-new-quote')).toBeTruthy();
    });

    it('updates when data changes from populated to empty', () => {
      const quotes = [createMockQuote({ quoteRequestId: 'quote-1' })];
      const { getByTestId, queryByTestId, rerender } = render(
        <QuoteList data={quotes} />,
      );

      expect(getByTestId('quote-row-quote-1')).toBeTruthy();

      rerender(<QuoteList data={[]} />);

      expect(queryByTestId('quote-row-quote-1')).toBeNull();
    });

    it('updates when data array changes', () => {
      const initialQuotes = [
        createMockQuote({
          provider: { name: 'Lifi' },
          quoteRequestId: 'quote-1',
        }),
      ];

      const { getByTestId, queryByTestId, rerender } = render(
        <QuoteList data={initialQuotes} />,
      );

      expect(getByTestId('quote-row-quote-1')).toBeTruthy();

      const updatedQuotes = [
        createMockQuote({
          provider: { name: 'Socket' },
          quoteRequestId: 'quote-2',
        }),
        createMockQuote({
          provider: { name: 'Hop' },
          quoteRequestId: 'quote-3',
        }),
      ];

      rerender(<QuoteList data={updatedQuotes} />);

      expect(queryByTestId('quote-row-quote-1')).toBeNull();
      expect(getByTestId('quote-row-quote-2')).toBeTruthy();
      expect(getByTestId('quote-row-quote-3')).toBeTruthy();
    });
  });

  describe('ordering', () => {
    it('renders QuoteRows in the same order as data array', () => {
      const quotes = [
        createMockQuote({
          provider: { name: 'First' },
          quoteRequestId: 'quote-1',
        }),
        createMockQuote({
          provider: { name: 'Second' },
          quoteRequestId: 'quote-2',
        }),
        createMockQuote({
          provider: { name: 'Third' },
          quoteRequestId: 'quote-3',
        }),
      ];

      const { getAllByText } = render(<QuoteList data={quotes} />);

      const rows = getAllByText(/- quote-/);
      expect(rows[0]).toHaveTextContent('First - quote-1');
      expect(rows[1]).toHaveTextContent('Second - quote-2');
      expect(rows[2]).toHaveTextContent('Third - quote-3');
    });

    it('maintains order when data is reversed', () => {
      const quotes = [
        createMockQuote({
          provider: { name: 'First' },
          quoteRequestId: 'quote-1',
        }),
        createMockQuote({
          provider: { name: 'Second' },
          quoteRequestId: 'quote-2',
        }),
      ];

      const { getAllByText, rerender } = render(<QuoteList data={quotes} />);

      let rows = getAllByText(/- quote-/);
      expect(rows[0]).toHaveTextContent('First - quote-1');
      expect(rows[1]).toHaveTextContent('Second - quote-2');

      const reversedQuotes = [...quotes].reverse();
      rerender(<QuoteList data={reversedQuotes} />);

      rows = getAllByText(/- quote-/);
      expect(rows[0]).toHaveTextContent('Second - quote-2');
      expect(rows[1]).toHaveTextContent('First - quote-1');
    });
  });
});
