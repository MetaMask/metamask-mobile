import { QuoteRowProps } from './QuoteRow';

export const QUOTES_PLACEHOLDER_DATA = [
  {
    provider: {
      name: 'test_provider',
    },
    formattedTotalCost: '1234.2',
    quoteRequestId: '1',
    onPress: () => {
      // Placeholder for loading state
    },
    loading: true,
  },
  {
    provider: {
      name: 'test_2',
    },
    formattedTotalCost: '23.0',
    quoteRequestId: '2',
    onPress: () => {
      // Placeholder for loading state
    },
    loading: true,
  },
] satisfies QuoteRowProps[];
