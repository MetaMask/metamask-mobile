import { SolScope } from '@metamask/keyring-api';

import { mockQuoteWithMetadata } from '../_mocks_/bridgeQuoteWithMetadata';
import type { BridgeToken } from '../types';
import { formatQuoteData } from './formatQuoteData';

const solToken: BridgeToken = {
  address: '11111111111111111111111111111111',
  chainId: SolScope.Mainnet,
  decimals: 9,
  symbol: 'SOL',
};

const usdcToken: BridgeToken = {
  address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  chainId: SolScope.Mainnet,
  decimals: 6,
  symbol: 'USDC',
};

const createConfig = (
  overrides: {
    sourceToken?: Pick<BridgeToken, 'symbol'>;
    destToken?: Pick<BridgeToken, 'symbol'>;
    sourceAmount?: string;
    destTokenAmount?: string;
    slippage?: string;
    currency?: string;
  } = {},
) => ({
  sourceToken: solToken,
  destToken: usdcToken,
  sourceAmount: '0.5',
  destTokenAmount: '57.056221',
  currency: 'USD',
  ...overrides,
});

describe('formatQuoteData', () => {
  it('returns placeholder quote data when quote is missing', () => {
    const result = formatQuoteData(
      undefined,
      createConfig({ destTokenAmount: undefined, slippage: '2.5' }),
    );

    expect(result).toEqual({
      networkFee: '-',
      estimatedTime: undefined,
      rate: '--',
      priceImpact: undefined,
      priceImpactFiat: undefined,
      slippage: '2.5%',
      receivedAmount: '-- USDC',
      receivedAmountFiat: '-',
    });
  });

  it('formats quote rate, time, fee, and slippage', () => {
    const result = formatQuoteData(mockQuoteWithMetadata, createConfig());

    expect(result).toEqual(
      expect.objectContaining({
        networkFee: '-',
        estimatedTime: '5 seconds',
        rate: expect.stringMatching(/1 SOL = .+ USDC/),
        priceImpact: '-0.20%',
        priceImpactFiat: undefined,
      }),
    );
  });

  it('formats slippage as Auto when slippage is unset', () => {
    const result = formatQuoteData(mockQuoteWithMetadata, createConfig());

    expect(result.slippage).toBe('Auto');
  });

  it('formats slippage as Auto when slippage is an empty string', () => {
    const result = formatQuoteData(
      mockQuoteWithMetadata,
      createConfig({ slippage: '' }),
    );

    expect(result.slippage).toBe('Auto');
  });

  it('formats slippage as a percent when slippage is set', () => {
    const result = formatQuoteData(
      mockQuoteWithMetadata,
      createConfig({ slippage: '2.5' }),
    );

    expect(result.slippage).toBe('2.5%');
  });

  it('formats estimated time in minutes when processing time is at least 60 seconds', () => {
    const result = formatQuoteData(
      {
        ...mockQuoteWithMetadata,
        estimatedProcessingTimeInSeconds: 90,
      },
      createConfig(),
    );

    expect(result.estimatedTime).toBe('2 min');
  });

  it('formats estimated time as less than one second when processing time is below 1', () => {
    const result = formatQuoteData(
      {
        ...mockQuoteWithMetadata,
        estimatedProcessingTimeInSeconds: 0,
      },
      createConfig(),
    );

    expect(result.estimatedTime).toBe('< 1 second');
  });

  it('includes the source token symbol in the rate', () => {
    const result = formatQuoteData(mockQuoteWithMetadata, createConfig());

    expect(result.rate).toMatch(/^1 SOL = /);
  });

  it('returns a placeholder rate when source amount is zero', () => {
    const result = formatQuoteData(
      mockQuoteWithMetadata,
      createConfig({ sourceAmount: '0' }),
    );

    expect(result.rate).toBe('--');
  });

  it('formats received amount and fiat from destination token amount', () => {
    const result = formatQuoteData(mockQuoteWithMetadata, createConfig());

    expect(result.receivedAmount).toEqual(expect.stringContaining('USDC'));
    expect(result.receivedAmountFiat).toBeDefined();
  });
});
