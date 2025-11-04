import React from 'react';
import { render } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import useCurrencyRatePolling from './useCurrencyRatePolling';
import useTokenRatesPolling from './useTokenRatesPolling';
import useTokenDetectionPolling from './useTokenDetectionPolling';
import useTokenListPolling from './useTokenListPolling';
import useTokenBalancesPolling from './useTokenBalancesPolling';

import { AssetPollingProvider } from './AssetPollingProvider';
import useMultichainAssetsRatePolling from './useMultichainAssetsRatePolling';

// Mock react-redux
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('./useCurrencyRatePolling', () => jest.fn());
jest.mock('./useTokenRatesPolling', () => jest.fn());
jest.mock('./useTokenDetectionPolling', () => jest.fn());
jest.mock('./useTokenListPolling', () => jest.fn());
jest.mock('./useTokenBalancesPolling', () => jest.fn());
jest.mock('./useAccountTrackerPolling', () => jest.fn());
jest.mock('./useMultichainAssetsRatePolling', () => jest.fn());
jest.mock('../../../selectors/accountsController', () => ({
  selectSelectedInternalAccount: jest.fn(),
}));

const CHAIN_IDS_MOCK = ['0x1', '0x2'];

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

describe('AssetPollingProvider', () => {
  const mockUseCurrencyRatePolling = jest.mocked(useCurrencyRatePolling);
  const mockUseTokenRatesPolling = jest.mocked(useTokenRatesPolling);
  const mockUseTokenDetectionPolling = jest.mocked(useTokenDetectionPolling);
  const mockUseTokenListPolling = jest.mocked(useTokenListPolling);
  const mockUseTokenBalancesPolling = jest.mocked(useTokenBalancesPolling);
  const mockUseMultichainAssetsRatePolling = jest.mocked(
    useMultichainAssetsRatePolling,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    // Mock useSelector to return a mock account
    mockUseSelector.mockReturnValue({
      id: 'mock-account-id',
      address: '0x123',
      metadata: { name: 'Test Account' },
    });
  });

  it('calls all polling hooks', () => {
    render(<AssetPollingProvider />);

    expect(mockUseCurrencyRatePolling).toHaveBeenCalledWith(undefined);
    expect(mockUseTokenRatesPolling).toHaveBeenCalledWith(undefined);
    expect(mockUseTokenDetectionPolling).toHaveBeenCalledWith(undefined);
    expect(mockUseTokenListPolling).toHaveBeenCalledWith(undefined);
    expect(mockUseTokenBalancesPolling).toHaveBeenCalledWith(undefined);
    expect(mockUseMultichainAssetsRatePolling).toHaveBeenCalledWith({
      accountId: 'mock-account-id',
    });
  });

  it('calls polling hooks with correct params if provided', () => {
    render(
      <AssetPollingProvider
        chainIds={['0x1', '0x2']}
        address="0x1234567890abcdef"
      />,
    );

    expect(mockUseCurrencyRatePolling).toHaveBeenCalledWith({
      chainIds: CHAIN_IDS_MOCK,
    });

    expect(mockUseTokenRatesPolling).toHaveBeenCalledWith({
      chainIds: CHAIN_IDS_MOCK,
    });

    expect(mockUseTokenDetectionPolling).toHaveBeenCalledWith({
      chainIds: CHAIN_IDS_MOCK,
      address: '0x1234567890abcdef',
    });

    expect(mockUseTokenListPolling).toHaveBeenCalledWith({
      chainIds: CHAIN_IDS_MOCK,
    });

    expect(mockUseTokenBalancesPolling).toHaveBeenCalledWith({
      chainIds: CHAIN_IDS_MOCK,
    });

    expect(mockUseMultichainAssetsRatePolling).toHaveBeenCalledWith({
      accountId: 'mock-account-id',
    });
  });
});
