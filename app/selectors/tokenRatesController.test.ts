import { MarketDataDetails } from '@metamask/assets-controllers';
import { RootState } from '../reducers';
import {
  selectContractExchangeRates,
  selectContractExchangeRatesByChainId,
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
  } as RootState);

const createMockMarketTokenDetails = () => {
  const mockChainMarketDetails = {
    '0x111': {
      price: 0.1,
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
