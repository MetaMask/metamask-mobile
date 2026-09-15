import { SolScope } from '@metamask/keyring-api';
import { CaipChainId } from '@metamask/utils';
import { createMockToken } from '../../testUtils/fixtures';
import { LimitOrderExecutionType } from '../../constants/limitOrders';
import {
  getIsSwapsLimitOrderStablecoin,
  getSwapsLimitOrderDefaultPriceMode,
} from './getSwapsLimitOrderDefaultPriceMode';

const eth = createMockToken({
  address: '0x0000000000000000000000000000000000000000',
  symbol: 'ETH',
  decimals: 18,
});

const link = createMockToken({
  address: '0x514910771af9ca656af840dff83e8264ecf986ca',
  symbol: 'LINK',
  decimals: 18,
});

const usdc = createMockToken({
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  symbol: 'USDC',
  decimals: 6,
});

const usdt = createMockToken({
  address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
  symbol: 'USDT',
  decimals: 6,
});

const musd = createMockToken({
  address: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
  symbol: 'mUSD',
  decimals: 6,
});

describe('getIsSwapsLimitOrderStablecoin', () => {
  it('detects a stablecoin from a lowercase address', () => {
    expect(getIsSwapsLimitOrderStablecoin(usdc)).toBe(true);
  });

  it('detects a stablecoin from a checksum address', () => {
    expect(
      getIsSwapsLimitOrderStablecoin(
        createMockToken({
          address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          symbol: 'USDC',
        }),
      ),
    ).toBe(true);
  });

  it('detects a stablecoin on a chain identified by its CAIP chain id', () => {
    expect(
      getIsSwapsLimitOrderStablecoin(
        createMockToken({
          address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          symbol: 'USDC',
          chainId: 'eip155:8453' as CaipChainId,
        }),
      ),
    ).toBe(true);
  });

  it('detects mUSD as a stablecoin on Ethereum mainnet', () => {
    expect(getIsSwapsLimitOrderStablecoin(musd)).toBe(true);
  });

  it('detects mUSD as a stablecoin on Linea', () => {
    expect(
      getIsSwapsLimitOrderStablecoin(
        createMockToken({
          address: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
          symbol: 'mUSD',
          chainId: '0xe708',
        }),
      ),
    ).toBe(true);
  });

  it('does not detect a stablecoin outside the configured chain', () => {
    expect(
      getIsSwapsLimitOrderStablecoin(
        createMockToken({ ...usdc, chainId: '0x89' }),
      ),
    ).toBe(false);
  });

  it('does not detect a stablecoin on a chain with no configured stablecoins', () => {
    expect(
      getIsSwapsLimitOrderStablecoin(
        createMockToken({ ...usdc, chainId: '0x270f' }),
      ),
    ).toBe(false);
  });

  it('does not detect a stablecoin on a non-EVM chain', () => {
    expect(
      getIsSwapsLimitOrderStablecoin(
        createMockToken({
          address: `${SolScope.Mainnet}/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`,
          symbol: 'USDC',
          chainId: SolScope.Mainnet,
        }),
      ),
    ).toBe(false);
  });

  it('does not detect a stablecoin for a missing token', () => {
    expect(getIsSwapsLimitOrderStablecoin(undefined)).toBe(false);
  });
});

describe('getSwapsLimitOrderDefaultPriceMode', () => {
  it('prices the destination token in fiat when neither token is a stablecoin', () => {
    expect(
      getSwapsLimitOrderDefaultPriceMode({
        sourceToken: eth,
        destToken: link,
      }),
    ).toEqual({
      executionType: LimitOrderExecutionType.BUY,
      isLimitFiatMode: true,
    });
  });

  it('prices the destination token in the source stablecoin when only the source is a stablecoin', () => {
    expect(
      getSwapsLimitOrderDefaultPriceMode({
        sourceToken: usdc,
        destToken: eth,
      }),
    ).toEqual({
      executionType: LimitOrderExecutionType.BUY,
      isLimitFiatMode: false,
    });
  });

  it('prices the source token in the destination stablecoin when only the destination is a stablecoin', () => {
    expect(
      getSwapsLimitOrderDefaultPriceMode({
        sourceToken: eth,
        destToken: usdc,
      }),
    ).toEqual({
      executionType: LimitOrderExecutionType.SELL,
      isLimitFiatMode: false,
    });
  });

  it('sells ETH priced in mUSD for the default Ethereum limit order pair', () => {
    expect(
      getSwapsLimitOrderDefaultPriceMode({
        sourceToken: eth,
        destToken: musd,
      }),
    ).toEqual({
      executionType: LimitOrderExecutionType.SELL,
      isLimitFiatMode: false,
    });
  });

  it('prices the destination token in the source stablecoin when both tokens are stablecoins', () => {
    expect(
      getSwapsLimitOrderDefaultPriceMode({
        sourceToken: usdc,
        destToken: usdt,
      }),
    ).toEqual({
      executionType: LimitOrderExecutionType.BUY,
      isLimitFiatMode: false,
    });
  });

  it('prices the destination token in fiat while the pair is incomplete', () => {
    expect(
      getSwapsLimitOrderDefaultPriceMode({
        sourceToken: undefined,
        destToken: undefined,
      }),
    ).toEqual({
      executionType: LimitOrderExecutionType.BUY,
      isLimitFiatMode: true,
    });
  });
});
