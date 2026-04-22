import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureStore } from '@reduxjs/toolkit';
import RampsBootstrap from './RampsBootstrap';

const mockUseRampsSmartRouting = jest.fn();
const mockUseRampsProviders = jest.fn();
const mockUseRampsPaymentMethods = jest.fn();

jest.mock('./hooks/useRampsSmartRouting', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockUseRampsSmartRouting(...args),
}));

jest.mock('./hooks/useRampsProviders', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockUseRampsProviders(...args),
}));

jest.mock('./hooks/useRampsPaymentMethods', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockUseRampsPaymentMethods(...args),
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    RampsController: {
      getTokens: jest.fn().mockResolvedValue({ topTokens: [], allTokens: [] }),
    },
  },
}));

const createMockStore = () =>
  configureStore({
    reducer: {
      engine: () => ({
        backgroundState: {
          RampsController: {
            userRegion: {
              regionCode: 'us',
              country: { currency: 'USD' },
            },
          },
        },
      }),
    },
  });

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const renderBootstrap = () => {
  const store = createMockStore();
  return render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <RampsBootstrap />
      </QueryClientProvider>
    </Provider>,
  );
};

describe('RampsBootstrap', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls useRampsSmartRouting on mount', () => {
    renderBootstrap();
    expect(mockUseRampsSmartRouting).toHaveBeenCalledTimes(1);
  });

  it('calls useRampsProviders on mount', () => {
    renderBootstrap();
    expect(mockUseRampsProviders).toHaveBeenCalledTimes(1);
  });

  it('calls useRampsPaymentMethods on mount', () => {
    renderBootstrap();
    expect(mockUseRampsPaymentMethods).toHaveBeenCalledTimes(1);
  });

  it('renders null', () => {
    const { toJSON } = renderBootstrap();
    expect(toJSON()).toBeNull();
  });
});
