import type { Hex } from '@metamask/utils';
import type { BridgeToken } from '../../../../../../UI/Bridge/types';
import { selectDefaultReceiveToken } from './selectDefaultReceiveToken';

const BASE = '0x2105' as Hex;
const POLYGON = '0x89' as Hex;
const NATIVE_ADDRESS = '0x0000000000000000000000000000000000000000';
const USDC_BASE = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
const USDC_POLYGON = '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359';
const USDT_POLYGON = '0xc2132d05d31c914a87c6611c10748aeb04b58e8f';

const token = (symbol: string, address: string, chainId: Hex): BridgeToken =>
  ({
    symbol,
    address,
    chainId,
    decimals: 6,
  }) as BridgeToken;

const usdcBase = token('USDC', USDC_BASE, BASE);
const ethBase = token('ETH', NATIVE_ADDRESS, BASE);
const usdcPolygon = token('USDC', USDC_POLYGON, POLYGON);
const usdtPolygon = token('USDT', USDT_POLYGON, POLYGON);
const polPolygon = token('POL', NATIVE_ADDRESS, POLYGON);

describe('selectDefaultReceiveToken', () => {
  it('returns undefined when there are no options', () => {
    expect(selectDefaultReceiveToken([], usdcBase)).toBeUndefined();
  });

  it('returns the first option when the sold token is unknown', () => {
    const options = [usdcBase, ethBase];
    expect(selectDefaultReceiveToken(options, undefined)).toBe(usdcBase);
  });

  it('defaults to the native token of the chain when selling a stablecoin', () => {
    // Receive options are ordered stablecoins-first on the position chain, so a
    // naive options[0] would return USDC — the very token being sold.
    const options = [usdcBase, ethBase, usdcPolygon];
    expect(selectDefaultReceiveToken(options, usdcBase)).toBe(ethBase);
  });

  it('matches the sold token case-insensitively before excluding it', () => {
    const options = [usdcBase, ethBase];
    const soldUpperCase = token('USDC', USDC_BASE.toUpperCase(), BASE);
    expect(selectDefaultReceiveToken(options, soldUpperCase)).toBe(ethBase);
  });

  it('falls back to the first eligible candidate when selling the native token', () => {
    // Selling ETH on Base: native preference would re-select ETH, so we fall
    // through to the first non-ETH candidate.
    const options = [ethBase, usdcBase];
    expect(selectDefaultReceiveToken(options, ethBase)).toBe(usdcBase);
  });

  it('falls back to the first eligible candidate when the native token is not an option', () => {
    // No native candidate present for the sold token's chain.
    const options = [usdcPolygon, usdtPolygon];
    expect(selectDefaultReceiveToken(options, usdcPolygon)).toBe(usdtPolygon);
  });

  it('only prefers the native token on the sold token chain', () => {
    // Native ETH/Base must not be chosen when selling on Polygon — the native
    // preference is scoped to the sold token's own chain.
    const options = [usdcPolygon, polPolygon, ethBase];
    expect(selectDefaultReceiveToken(options, usdcPolygon)).toBe(polPolygon);
  });

  it('returns the first option when every candidate is the sold token', () => {
    const options = [usdcBase];
    expect(selectDefaultReceiveToken(options, usdcBase)).toBe(usdcBase);
  });

  it('defaults to the same-chain USDT when selling native TRX on Tron', () => {
    // Selling native TRX: the native preference resolves back to TRX (the sold
    // token) and is skipped, so the same-chain USDT stablecoin (ordered first)
    // is preselected instead of a cross-chain destination.
    const TRON = 'tron:728126428' as unknown as Hex;
    const trxNative = token('TRX', 'tron:728126428/slip44:195', TRON);
    const usdtTron = token(
      'USDT',
      'tron:728126428/trc20:TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
      TRON,
    );
    const options = [usdtTron, trxNative, usdcBase];
    expect(selectDefaultReceiveToken(options, trxNative)).toBe(usdtTron);
  });

  it('defaults to the same-chain USDC when selling native XLM on Stellar', () => {
    const STELLAR = 'stellar:pubnet' as unknown as Hex;
    const xlmNative = token('XLM', 'stellar:pubnet/slip44:148', STELLAR);
    const usdcStellar = token(
      'USDC',
      'stellar:pubnet/asset:USDC-GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
      STELLAR,
    );
    const options = [usdcStellar, xlmNative, usdcBase];
    expect(selectDefaultReceiveToken(options, xlmNative)).toBe(usdcStellar);
  });
});
