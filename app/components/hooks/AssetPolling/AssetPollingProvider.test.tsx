import React from 'react';
import { render } from '@testing-library/react-native';

import { AssetPollingProvider } from './AssetPollingProvider';

jest.mock('./useCurrencyRatePolling', () => jest.fn());
jest.mock('./useTokenRatesPolling', () => jest.fn());
jest.mock('./useTokenDetectionPolling', () => jest.fn());
jest.mock('./useTokenListPolling', () => jest.fn());
jest.mock('./useTokenBalancesPolling', () => jest.fn());
jest.mock('./useAccountTrackerPolling', () => jest.fn());

describe('AssetPollingProvider', () => {
  it('should call all polling hooks', () => {
    render(
      <AssetPollingProvider>
        <div></div>
      </AssetPollingProvider>,
    );

    expect(jest.requireMock('./useCurrencyRatePolling')).toHaveBeenCalled();
    expect(jest.requireMock('./useTokenRatesPolling')).toHaveBeenCalled();
    expect(jest.requireMock('./useTokenDetectionPolling')).toHaveBeenCalled();
    expect(jest.requireMock('./useTokenListPolling')).toHaveBeenCalled();
    expect(jest.requireMock('./useTokenBalancesPolling')).toHaveBeenCalled();
    expect(jest.requireMock('./useAccountTrackerPolling')).toHaveBeenCalled();
  });
});
