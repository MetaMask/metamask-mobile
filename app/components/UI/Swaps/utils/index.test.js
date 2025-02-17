import { getFetchParams } from './index';

describe('getFetchParams', () => {
  const mockSourceToken = {
    address: '0x123',
    symbol: 'TOKEN1',
    decimals: 18,
  };

  const mockDestinationToken = {
    address: '0x456',
    symbol: 'TOKEN2',
    decimals: 18,
  };

  const mockBaseParams = {
    slippage: 1,
    sourceToken: mockSourceToken,
    destinationToken: mockDestinationToken,
    sourceAmount: '1000000000000000000', // 1 token in wei
    walletAddress: '0x789',
    networkClientId: '1',
    enableGasIncludedQuotes: true,
  };

  it('returns correct parameters with default slippage', () => {
    const result = getFetchParams(mockBaseParams);

    expect(result).toEqual({
      slippage: 1,
      sourceToken: mockSourceToken.address,
      destinationToken: mockDestinationToken.address,
      sourceAmount: '1000000000000000000',
      walletAddress: '0x789',
      metaData: {
        sourceTokenInfo: mockSourceToken,
        destinationTokenInfo: mockDestinationToken,
        networkClientId: '1',
      },
      enableGasIncludedQuotes: true,
    });
  });

  it('returns correct parameters with custom slippage', () => {
    const result = getFetchParams({
      ...mockBaseParams,
      slippage: 2,
    });

    expect(result).toEqual({
      slippage: 2,
      sourceToken: mockSourceToken.address,
      destinationToken: mockDestinationToken.address,
      sourceAmount: '1000000000000000000',
      walletAddress: '0x789',
      metaData: {
        sourceTokenInfo: mockSourceToken,
        destinationTokenInfo: mockDestinationToken,
        networkClientId: '1',
      },
      enableGasIncludedQuotes: true,
    });
  });

  it('returns correct parameters with gas included quotes disabled', () => {
    const result = getFetchParams({
      ...mockBaseParams,
      enableGasIncludedQuotes: false,
    });

    expect(result).toEqual({
      slippage: 1,
      sourceToken: mockSourceToken.address,
      destinationToken: mockDestinationToken.address,
      sourceAmount: '1000000000000000000',
      walletAddress: '0x789',
      metaData: {
        sourceTokenInfo: mockSourceToken,
        destinationTokenInfo: mockDestinationToken,
        networkClientId: '1',
      },
      enableGasIncludedQuotes: false,
    });
  });
});
