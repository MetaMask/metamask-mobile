import type { Hex } from '@metamask/utils';
import {
  MetricsSwapType,
  type QuoteResponse,
} from '@metamask/bridge-controller';
import {
  getAdvancedOrderTokenProperties,
  getAdvancedOrderTradeProperties,
} from './advancedOrders';
import { SecurityDataType, type BridgeToken } from '../types';

const ETH: BridgeToken = {
  address: '0x0000000000000000000000000000000000000000',
  chainId: '0x1' as Hex,
  decimals: 18,
  name: 'Ether',
  symbol: 'ETH',
};

const USDC: BridgeToken = {
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  chainId: '0x1' as Hex,
  decimals: 6,
  name: 'USD Coin',
  symbol: 'USDC',
};

describe('getAdvancedOrderTokenProperties', () => {
  it('returns the Unified SwapBridge request parameters in CAIP format', () => {
    const result = getAdvancedOrderTokenProperties({
      sourceToken: ETH,
      destToken: USDC,
    });

    expect(result).toEqual({
      chain_id_source: 'eip155:1',
      chain_id_destination: 'eip155:1',
      token_symbol_source: 'ETH',
      token_symbol_destination: 'USDC',
      token_address_source: 'eip155:1/slip44:60',
      token_address_destination:
        'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      token_security_type_destination: null,
      swap_type: MetricsSwapType.SINGLE,
    });
  });

  it('reports the destination token security type when it is known', () => {
    const result = getAdvancedOrderTokenProperties({
      sourceToken: ETH,
      destToken: {
        ...USDC,
        securityData: { type: SecurityDataType.Verified },
      },
    });

    expect(result.token_security_type_destination).toBe(
      SecurityDataType.Verified,
    );
  });

  it('leaves the destination properties empty when no destination token is selected', () => {
    const result = getAdvancedOrderTokenProperties({ sourceToken: ETH });

    expect(result).toMatchObject({
      chain_id_destination: null,
      token_symbol_destination: null,
      token_address_destination: null,
    });
  });
});

describe('getAdvancedOrderTradeProperties', () => {
  it('returns the Unified SwapBridge trade properties of the quote', () => {
    const quote = {
      quote: {
        aggregator: 'lifi',
        protocols: ['uniswap'],
        gasIncluded: true,
        gasIncluded7702: false,
        dest: { usd: '99.5' },
        feeData: { network: [{ usd: '0.42' }] },
        priceData: { priceImpact: { amount: '0.0031' } },
      },
      estimatedProcessingTimeInSeconds: 90,
    } as unknown as QuoteResponse;

    expect(getAdvancedOrderTradeProperties(quote)).toEqual({
      provider: 'lifi_uniswap',
      usd_quoted_gas: 0.42,
      usd_quoted_return: 99.5,
      quoted_time_minutes: 1.5,
      gas_included: true,
      gas_included_7702: false,
      price_impact: 0.0031,
    });
  });

  it('returns empty trade properties while there is no quote', () => {
    expect(getAdvancedOrderTradeProperties(undefined)).toEqual({
      provider: '_',
      usd_quoted_gas: 0,
      usd_quoted_return: 0,
      quoted_time_minutes: 0,
      gas_included: false,
      gas_included_7702: false,
      price_impact: 0,
    });
  });
});
