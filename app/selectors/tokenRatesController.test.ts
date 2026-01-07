import { MarketDataDetails } from '@metamask/assets-controllers';
import { RootState } from '../reducers';
import {
  selectContractExchangeRates,
  selectContractExchangeRatesByChainId,
  selectPricePercentChange1d,
  selectSingleTokenPriceMarketData,
  selectTokenMarketData,
  selectTokenMarketDataByChainId,
  selectTokenMarketPriceData,
} from './tokenRatesController';

const createMockState = () =>
  ({
    engine: {
      backgroundState: {
        TokenRatesController: {
          marketData: {},
        },
      },
    },
  }) as RootState;

const createMockMarketTokenDetails = () => {
  const mockChainMarketDetails = {
    '0x111': {
      price: 0.1,
      pricePercentChange1d: 0.01,
    } as MarketDataDetails,
  };
  return mockChainMarketDetails;
};

describe('selectContractExchangeRates', () => {
  const arrange = () => {
    const mockState = createMockState();
    const mockChainMarketDetails = createMockMarketTokenDetails();
    mockState.engine.backgroundState.TokenRatesController.marketData = {
      '0x1': mockChainMarketDetails,
    };

    return {
      mockChainMarketDetails,
      mockState,
    };
  };

  it('returns marketData for selected chain', () => {
    const { mockState, mockChainMarketDetails } = arrange();
    expect(selectContractExchangeRates(mockState)).toStrictEqual(
      mockChainMarketDetails,
    );
  });
});

describe('selectContractExchangeRatesByChainId', () => {
  const arrange = () => {
    const mockState = createMockState();
    const mockChainMarketDetails = createMockMarketTokenDetails();
    mockState.engine.backgroundState.TokenRatesController.marketData = {
      '0x1': mockChainMarketDetails,
    };

    return {
      mockChainMarketDetails,
      mockState,
    };
  };

  it('returns marketData for explicitly provided chain id', () => {
    const { mockState, mockChainMarketDetails } = arrange();
    expect(
      selectContractExchangeRatesByChainId(mockState, '0x1'),
    ).toStrictEqual(mockChainMarketDetails);
  });
});

describe('selectTokenMarketData', () => {
  it('returns market data for all chains and tokens', () => {
    const mockState = createMockState();
    expect(selectTokenMarketData(mockState)).toStrictEqual(
      mockState.engine.backgroundState.TokenRatesController.marketData,
    );
  });
});

describe('selectTokenMarketPriceData', () => {
  const arrange = () => {
    const mockState = createMockState();
    const mockChainMarketDetails = createMockMarketTokenDetails();
    mockChainMarketDetails['0x111'].allTimeHigh = 50;
    mockState.engine.backgroundState.TokenRatesController.marketData = {
      '0x1': mockChainMarketDetails,
    };

    return {
      mockChainMarketDetails,
      mockState,
    };
  };

  it('returns slimmed market data with only the price field', () => {
    const { mockState, mockChainMarketDetails } = arrange();
    const result = selectTokenMarketPriceData(mockState);
    expect(result).toStrictEqual({
      '0x1': {
        '0x111': { price: mockChainMarketDetails['0x111'].price },
      },
    });
  });
});

describe('selectTokenMarketDataByChainId', () => {
  const arrange = () => {
    const mockState = createMockState();
    const mockChainMarketDetails = createMockMarketTokenDetails();
    mockState.engine.backgroundState.TokenRatesController.marketData = {
      '0x1': mockChainMarketDetails,
    };

    return {
      mockChainMarketDetails,
      mockState,
    };
  };

  it('returns marketData for explicitly provided chain id', () => {
    const { mockState, mockChainMarketDetails } = arrange();
    expect(selectTokenMarketDataByChainId(mockState, '0x1')).toStrictEqual(
      mockChainMarketDetails,
    );
  });

  it('fallbacks to an empty object', () => {
    const { mockState } = arrange();
    expect(selectTokenMarketDataByChainId(mockState, '0x999')).toStrictEqual(
      {},
    );
  });
});

describe('selectPricePercentChange1d', () => {
  const arrange = () => {
    const mockState = createMockState();
    const mockChainMarketDetails = createMockMarketTokenDetails();
    mockState.engine.backgroundState.TokenRatesController.marketData = {
      '0x1': mockChainMarketDetails,
    };

    return {
      mockChainMarketDetails,
      mockState,
    };
  };

  it('returns pricePercentage1d from a given chainId and tokenAddress', () => {
    const { mockState } = arrange();
    const result = selectPricePercentChange1d(mockState, '0x1', '0x111');
    expect(result).toBe(0.01);
  });

  it('returns undefined when selecting state from an mising chainId or tokenAddress', () => {
    const { mockState } = arrange();
    expect(
      selectPricePercentChange1d(mockState, '0xMissingChainId', '0x111'),
    ).toBeUndefined();
    expect(
      selectPricePercentChange1d(mockState, '0x1', '0xMissingTokenAddress'),
    ).toBeUndefined();
  });
});

describe('selectSingleTokenPriceMarketData', () => {
  const arrange = () => {
    const mockState = createMockState();
    const mockChainMarketDetails = createMockMarketTokenDetails();
    mockState.engine.backgroundState.TokenRatesController.marketData = {
      '0x1': mockChainMarketDetails,
    };

    return {
      mockChainMarketDetails,
      mockState,
    };
  };

  it('returns single price market data for given chainId & token', () => {
    const { mockState } = arrange();
    const result = selectSingleTokenPriceMarketData(mockState, '0x1', '0x111');
    expect(result).toStrictEqual({ '0x111': { price: 0.1 } });
  });

  it('returns empty obj if missing market data for given chainId & token', () => {
    const { mockState } = arrange();
    expect(
      selectSingleTokenPriceMarketData(mockState, '0xMissingChainId', '0x111'),
    ).toStrictEqual({});
    expect(
      selectSingleTokenPriceMarketData(
        mockState,
        '0x1',
        '0xMissingTokenAddress',
      ),
    ).toStrictEqual({});
  });

  it('memoizes parameters and result from selector', () => {
    const { mockState } = arrange();
    mockState.engine.backgroundState.TokenRatesController.marketData = {
      '0x1': createMockMarketTokenDetails(),
      '0x2': createMockMarketTokenDetails(),
    };

    const result1 = selectSingleTokenPriceMarketData(mockState, '0x1', '0x111');
    const result2 = selectSingleTokenPriceMarketData(mockState, '0x2', '0x111');
    const result3 = selectSingleTokenPriceMarketData(mockState, '0x1', '0x111');
    const result4 = selectSingleTokenPriceMarketData(mockState, '0x2', '0x111');

    // Assert same reference for selectors that used same paramters
    expect(result1).toBe(result3);
    expect(result2).toBe(result4);
  });
});
