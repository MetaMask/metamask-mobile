import { TrxScope } from '@metamask/keyring-api';
import type { TokenI } from '../../Tokens/types';
import { isTronNativeAssetId, isTronNativeToken } from './isTronNativeToken';

const TRON_NATIVE_MAINNET = `${TrxScope.Mainnet}/slip44:195`;
const TRON_NATIVE_HEX_CHAIN = 'tron:0x2b6653dc/slip44:195';
const TRON_STAKED_ENERGY = `${TrxScope.Mainnet}/slip44:195-staked-for-energy`;
const TRON_USDT = `${TrxScope.Mainnet}/token:TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`;

const createToken = (overrides: Partial<TokenI> = {}): TokenI =>
  ({
    address: TRON_NATIVE_MAINNET,
    chainId: TrxScope.Mainnet,
    symbol: 'TRX',
    name: 'TRON',
    decimals: 6,
    balance: '1',
    image: '',
    logo: '',
    isETH: false,
    isNative: true,
    ...overrides,
  }) as TokenI;

describe('isTronNativeAssetId', () => {
  it('returns true for native TRX CAIP-19 on mainnet', () => {
    expect(isTronNativeAssetId(TRON_NATIVE_MAINNET)).toBe(true);
  });

  it('returns true for native TRX CAIP-19 with hex chain reference', () => {
    expect(isTronNativeAssetId(TRON_NATIVE_HEX_CHAIN)).toBe(true);
  });

  it('returns false for staked TRX synthetic CAIP-19', () => {
    expect(isTronNativeAssetId(TRON_STAKED_ENERGY)).toBe(false);
  });

  it('returns false for TRC-20 CAIP-19', () => {
    expect(isTronNativeAssetId(TRON_USDT)).toBe(false);
  });

  it('returns false for undefined and non-CAIP strings', () => {
    expect(isTronNativeAssetId(undefined)).toBe(false);
    expect(isTronNativeAssetId('TRX')).toBe(false);
  });
});

describe('isTronNativeToken', () => {
  it('returns true when address is native TRX CAIP-19 even without ticker', () => {
    const token = createToken({ ticker: undefined, symbol: 'Tron' });

    expect(isTronNativeToken(token)).toBe(true);
  });

  it('returns false when ticker is TRX but address is a TRC-20 CAIP-19', () => {
    const token = createToken({
      address: TRON_USDT,
      ticker: 'TRX',
      symbol: 'TRX',
      isNative: false,
    });

    expect(isTronNativeToken(token)).toBe(false);
  });

  it('returns false when address is a staked TRX CAIP-19', () => {
    const token = createToken({
      address: TRON_STAKED_ENERGY,
      ticker: 'TRX',
      isNative: true,
    });

    expect(isTronNativeToken(token)).toBe(false);
  });

  it('returns true when caipAssetId is native TRX CAIP-19', () => {
    const token = createToken({
      address: '',
      chainId: undefined,
      caipAssetId: TRON_NATIVE_MAINNET,
    } as TokenI & { caipAssetId: string });

    expect(isTronNativeToken(token)).toBe(true);
  });

  it('returns true for legacy TokenI with empty address and CAIP-2 chainId', () => {
    const token = createToken({
      address: '',
      chainId: TrxScope.Mainnet,
    });

    expect(isTronNativeToken(token)).toBe(true);
  });

  it('returns false for ETH native token', () => {
    const token = createToken({
      address: '0x0000000000000000000000000000000000000000',
      chainId: '0x1',
      ticker: 'ETH',
      symbol: 'ETH',
    });

    expect(isTronNativeToken(token)).toBe(false);
  });
});
