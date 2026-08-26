import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { measureRenders } from 'reassure';
import configureStore from '../../../util/test/configureStore';
import initialRootState from '../../../util/test/initial-root-state';
import { mockTheme, ThemeContext } from '../../../util/theme';
import Homepage from './Homepage';

jest.mock(
  '@metamask/sentinel-api-service',
  () => ({
    SentinelApiService: class SentinelApiService {},
  }),
  { virtual: true },
);

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
  useFocusEffect: jest.fn(),
  useIsFocused: () => true,
}));

jest.mock('./Sections/Tokens/hooks/usePopularTokens', () => ({
  usePopularTokens: () => ({
    tokens: [],
    isInitialLoading: false,
    isRefreshing: false,
    error: null,
    refetch: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('../../UI/Money/hooks/useMoneyVaultApy', () => ({
  __esModule: true,
  default: () => ({
    apyPercent: undefined,
  }),
}));

jest.mock('../../hooks/useNftDetection', () => ({
  useNftDetection: () => ({
    detectNfts: jest.fn().mockResolvedValue(undefined),
    abortDetection: jest.fn(),
  }),
}));

jest.mock('../../hooks/useThrottledFocusEffect', () => ({
  useThrottledFocusEffect: jest.fn(),
}));

jest.mock('./hooks/useHomeSessionSummary', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn(() => ({})),
    })),
  }),
}));

const store = configureStore(initialRootState);
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
    },
  },
});
const ProvidersWrapper = ({ children }: { children: React.ReactElement }) => (
  <Provider store={store}>
    <ThemeContext.Provider value={mockTheme}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ThemeContext.Provider>
  </Provider>
);

test('Homepage top-level mount performance', async () => {
  await measureRenders(<Homepage />, {
    wrapper: ProvidersWrapper,
  });
});
