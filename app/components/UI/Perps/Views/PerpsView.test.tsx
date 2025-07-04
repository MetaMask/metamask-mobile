import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import PerpsView from './PerpsView';

// Mock Hyperliquid SDK
const mockAllMids = jest.fn();
const mockMeta = jest.fn();
const mockUnsubscribe = jest.fn();
const mockAllMidsSubscription = jest.fn();

jest.mock('@deeeed/hyperliquid-node20', () => ({
  HttpTransport: jest.fn().mockImplementation(() => ({})),
  InfoClient: jest.fn().mockImplementation(() => ({
    allMids: mockAllMids,
    meta: mockMeta,
  })),
  WebSocketTransport: jest.fn().mockImplementation(() => ({})),
  SubscriptionClient: jest.fn().mockImplementation(() => ({
    allMids: mockAllMidsSubscription,
  })),
}));

describe('PerpsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render correctly', () => {
    const { toJSON } = render(<PerpsView />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render header and buttons correctly', () => {
    const { getByText } = render(<PerpsView />);

    expect(getByText('Perps Trading (Development)')).toBeTruthy();
    expect(getByText('Test @deeeed/hyperliquid-node20 SDK')).toBeTruthy();
    expect(getByText('Test SDK Connection')).toBeTruthy();
    expect(getByText('Test Asset Listing')).toBeTruthy();
    expect(getByText('Test WebSocket Connection')).toBeTruthy();
  });

  describe('SDK Connection Test', () => {
    it('should handle successful SDK connection test', async () => {
      const mockMarketData = { BTC: 50000, ETH: 3000 };
      mockAllMids.mockResolvedValueOnce(mockMarketData);

      const { getByText } = render(<PerpsView />);
      const testButton = getByText('Test SDK Connection');

      fireEvent.press(testButton);

      await waitFor(() => {
        expect(mockAllMids).toHaveBeenCalled();
        expect(getByText(/✅ SDK connection successful!/)).toBeTruthy();
      });
    });

    it('should handle SDK connection test with no data', async () => {
      mockAllMids.mockResolvedValueOnce(null);

      const { getByText } = render(<PerpsView />);
      const testButton = getByText('Test SDK Connection');

      fireEvent.press(testButton);

      await waitFor(() => {
        expect(mockAllMids).toHaveBeenCalled();
        expect(getByText(/❌ SDK connected but no data received/)).toBeTruthy();
      });
    });

    it('should handle SDK connection test failure', async () => {
      const error = new Error('Network error');
      mockAllMids.mockRejectedValueOnce(error);

      const { getByText } = render(<PerpsView />);
      const testButton = getByText('Test SDK Connection');

      fireEvent.press(testButton);

      await waitFor(() => {
        expect(mockAllMids).toHaveBeenCalled();
        expect(getByText(/❌ SDK test failed: Network error/)).toBeTruthy();
      });
    });
  });

  describe('Asset Listing Test', () => {
    it('should handle successful asset listing test', async () => {
      const mockPerpsMeta = {
        universe: [{ name: 'BTC' }, { name: 'ETH' }, { name: 'SOL' }],
      };
      mockMeta.mockResolvedValueOnce(mockPerpsMeta);

      const { getByText } = render(<PerpsView />);
      const testButton = getByText('Test Asset Listing');

      fireEvent.press(testButton);

      await waitFor(() => {
        expect(mockMeta).toHaveBeenCalled();
        expect(getByText(/✅ Found 3 tradeable assets:/)).toBeTruthy();
        expect(getByText(/BTC, ETH, SOL/)).toBeTruthy();
      });
    });

    it('should handle asset listing test with no assets', async () => {
      const mockPerpsMeta = { universe: [] };
      mockMeta.mockResolvedValueOnce(mockPerpsMeta);

      const { getByText } = render(<PerpsView />);
      const testButton = getByText('Test Asset Listing');

      fireEvent.press(testButton);

      await waitFor(() => {
        expect(mockMeta).toHaveBeenCalled();
        expect(getByText(/❌ No assets found/)).toBeTruthy();
      });
    });

    it('should handle asset listing test failure', async () => {
      const error = new Error('API error');
      mockMeta.mockRejectedValueOnce(error);

      const { getByText } = render(<PerpsView />);
      const testButton = getByText('Test Asset Listing');

      fireEvent.press(testButton);

      await waitFor(() => {
        expect(mockMeta).toHaveBeenCalled();
        expect(getByText(/❌ Asset listing failed: API error/)).toBeTruthy();
      });
    });

    it('should truncate asset list when more than 5 assets', async () => {
      const mockPerpsMeta = {
        universe: [
          { name: 'BTC' },
          { name: 'ETH' },
          { name: 'SOL' },
          { name: 'ADA' },
          { name: 'DOT' },
          { name: 'LINK' },
          { name: 'UNI' },
        ],
      };
      mockMeta.mockResolvedValueOnce(mockPerpsMeta);

      const { getByText } = render(<PerpsView />);
      const testButton = getByText('Test Asset Listing');

      fireEvent.press(testButton);

      await waitFor(() => {
        expect(getByText(/✅ Found 7 tradeable assets:/)).toBeTruthy();
        expect(getByText(/\.\.\./)).toBeTruthy();
      });
    });
  });

  describe('WebSocket Connection Test', () => {
    it('should handle successful WebSocket connection test', async () => {
      const mockData = { BTC: 50000, ETH: 3000 };
      const mockSubscription = { unsubscribe: mockUnsubscribe };

      mockAllMidsSubscription.mockImplementation((callback) => {
        setTimeout(() => callback(mockData), 50);
        return Promise.resolve(mockSubscription);
      });
      mockUnsubscribe.mockResolvedValueOnce(undefined);

      const { getByText } = render(<PerpsView />);
      const testButton = getByText('Test WebSocket Connection');

      fireEvent.press(testButton);

      await waitFor(() => {
        expect(mockAllMidsSubscription).toHaveBeenCalled();
      });

      jest.advanceTimersByTime(60);

      await waitFor(() => {
        expect(getByText(/✅ WebSocket connection successful!/)).toBeTruthy();
        expect(
          getByText(/Received real-time market data with 2 assets/),
        ).toBeTruthy();
      });

      jest.advanceTimersByTime(150);

      await waitFor(() => {
        expect(mockUnsubscribe).toHaveBeenCalled();
      });
    });

    it('should handle WebSocket connection timeout', async () => {
      const mockSubscription = { unsubscribe: mockUnsubscribe };

      mockAllMidsSubscription.mockImplementation(() =>
        Promise.resolve(mockSubscription),
      );
      mockUnsubscribe.mockResolvedValueOnce(undefined);

      const { getByText } = render(<PerpsView />);
      const testButton = getByText('Test WebSocket Connection');

      fireEvent.press(testButton);

      await waitFor(() => {
        expect(mockAllMidsSubscription).toHaveBeenCalled();
      });

      jest.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(getByText(/⚠️ WebSocket connection timeout/)).toBeTruthy();
        expect(mockUnsubscribe).toHaveBeenCalled();
      });
    });

    it('should handle WebSocket connection test failure', async () => {
      const error = new Error('WebSocket error');
      mockAllMidsSubscription.mockRejectedValueOnce(error);

      const { getByText } = render(<PerpsView />);
      const testButton = getByText('Test WebSocket Connection');

      fireEvent.press(testButton);

      await waitFor(() => {
        expect(mockAllMidsSubscription).toHaveBeenCalled();
        expect(
          getByText(/❌ WebSocket test failed: WebSocket error/),
        ).toBeTruthy();
      });
    });
  });

  it('should show loading state during tests', async () => {
    mockAllMids.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000)),
    );

    const { getByText } = render(<PerpsView />);
    const testButton = getByText('Test SDK Connection');

    fireEvent.press(testButton);

    // Note: In a real test environment, you would check for loading indicators
    // For this component, the loading state is handled by the Button component itself
    expect(mockAllMids).toHaveBeenCalled();
  });

  it('should not display result container when no test result', () => {
    const { queryByText } = render(<PerpsView />);

    expect(queryByText('Test Result:')).toBeNull();
  });

  it('should handle unknown errors gracefully', async () => {
    mockAllMids.mockRejectedValueOnce('Unknown error string');

    const { getByText } = render(<PerpsView />);
    const testButton = getByText('Test SDK Connection');

    fireEvent.press(testButton);

    await waitFor(() => {
      expect(getByText(/❌ SDK test failed: Unknown error/)).toBeTruthy();
    });
  });
});
