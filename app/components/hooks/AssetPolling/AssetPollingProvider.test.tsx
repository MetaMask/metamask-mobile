import React from 'react';
import { render } from '@testing-library/react-native';
import useCurrencyRatePolling from './useCurrencyRatePolling';
import useTokenRatesPolling from './useTokenRatesPolling';
import useTokenDetectionPolling from './useTokenDetectionPolling';
import useTokenListPolling from './useTokenListPolling';
import useTokenBalancesPolling from './useTokenBalancesPolling';
import useAccountTrackerPolling from './useAccountTrackerPolling';

import { AssetPollingProvider } from './AssetPollingProvider';

jest.mock('./useCurrencyRatePolling', () => jest.fn());
jest.mock('./useTokenRatesPolling', () => jest.fn());
jest.mock('./useTokenDetectionPolling', () => jest.fn());
jest.mock('./useTokenListPolling', () => jest.fn());
jest.mock('./useTokenBalancesPolling', () => jest.fn());
jest.mock('./useAccountTrackerPolling', () => jest.fn());

const CHAIN_IDS_MOCK = ['0x1', '0x2'];

describe('AssetPollingProvider', () => {
  const mockUseAccountTrackerPolling = jest.mocked(useAccountTrackerPolling);
  const mockUseCurrencyRatePolling = jest.mocked(useCurrencyRatePolling);
  const mockUseTokenRatesPolling = jest.mocked(useTokenRatesPolling);
  const mockUseTokenDetectionPolling = jest.mocked(useTokenDetectionPolling);
  const mockUseTokenListPolling = jest.mocked(useTokenListPolling);
  const mockUseTokenBalancesPolling = jest.mocked(useTokenBalancesPolling);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('calls all polling hooks', () => {
    render(<AssetPollingProvider />);

    expect(mockUseAccountTrackerPolling).toHaveBeenCalled();
    expect(mockUseCurrencyRatePolling).toHaveBeenCalled();
    expect(mockUseTokenRatesPolling).toHaveBeenCalled();
    expect(mockUseTokenDetectionPolling).toHaveBeenCalled();
    expect(mockUseTokenListPolling).toHaveBeenCalled();
    expect(mockUseTokenBalancesPolling).toHaveBeenCalled();
  });

  it('calls polling hooks with correct params if provided', () => {
    render(
      <AssetPollingProvider
        chainIds={['0x1', '0x2']}
        networkClientId="networkClientId"
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

    expect(mockUseAccountTrackerPolling).toHaveBeenCalledWith({
      networkClientIds: ['networkClientId'],
    });
  });
});
