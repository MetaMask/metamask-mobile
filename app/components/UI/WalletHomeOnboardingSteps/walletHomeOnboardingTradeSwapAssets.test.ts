import { CHAIN_IDS } from '@metamask/transaction-controller';
import {
  getMainnetBtcBridgeToken,
  getMainnetEthBridgeToken,
  getMainnetMusdBridgeToken,
  MAINNET_MUSD_TOKEN_ADDRESS,
} from './walletHomeOnboardingTradeSwapAssets';

describe('walletHomeOnboardingTradeSwapAssets', () => {
  it('exposes mainnet mUSD bridge token with expected address', () => {
    const token = getMainnetMusdBridgeToken();

    expect(token.address).toBe(MAINNET_MUSD_TOKEN_ADDRESS);
    expect(token.chainId).toBe(CHAIN_IDS.MAINNET);
    expect(token.symbol).toBe('mUSD');
  });

  it('exposes mainnet ETH native bridge token', () => {
    const token = getMainnetEthBridgeToken();

    expect(token.symbol).toBe('ETH');
    expect(token.chainId).toBe(CHAIN_IDS.MAINNET);
  });

  it('exposes mainnet BTC bridge token from default pairs', () => {
    const token = getMainnetBtcBridgeToken();

    expect(token.symbol).toBe('BTC');
  });
});
