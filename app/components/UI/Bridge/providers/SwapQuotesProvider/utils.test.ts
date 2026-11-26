import { buildGenericQuoteRequest } from './utils';
import type { BridgeToken } from '../../types';

const walletAddress = '0x1111111111111111111111111111111111111111';
const destWalletAddress = '0x2222222222222222222222222222222222222222';
const moneyAccountAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

const srcToken: BridgeToken = {
  address: '0xsrc',
  symbol: 'USDC',
  decimals: 6,
  chainId: '0x1',
  name: 'USD Coin',
};

const destToken: BridgeToken = {
  address: '0xdest',
  symbol: 'USDT',
  decimals: 6,
  chainId: '0x1',
  name: 'Tether',
};

const moneyToken: BridgeToken = {
  ...destToken,
  symbol: 'MUSD',
  name: 'MetaMask Money',
  isMoneyToken: true,
};

const quoteParams = {
  srcAmount: '1.5',
  srcToken,
  destToken,
  walletAddress,
  destWalletAddress,
};

describe('buildGenericQuoteRequest', () => {
  it('uses destWalletAddress when dest is not money', () => {
    const result = buildGenericQuoteRequest({
      quoteParams,
      insufficientBalance: false,
      insufficientNativeReserveError: false,
    });

    expect(result?.destWalletAddress).toBe(destWalletAddress);
  });

  it('uses the money account as destWalletAddress when dest is money', () => {
    const result = buildGenericQuoteRequest({
      quoteParams: { ...quoteParams, destToken: moneyToken },
      insufficientBalance: false,
      insufficientNativeReserveError: false,
      moneyAccountAddress,
    });

    expect(result?.destWalletAddress).toBe(moneyAccountAddress);
  });

  it('uses destWalletAddress when dest is money but the money account has no address', () => {
    const result = buildGenericQuoteRequest({
      quoteParams: { ...quoteParams, destToken: moneyToken },
      insufficientBalance: false,
      insufficientNativeReserveError: false,
    });

    expect(result?.destWalletAddress).toBe(destWalletAddress);
  });

  it('uses walletAddress when dest is money and destWalletAddress is missing', () => {
    const result = buildGenericQuoteRequest({
      quoteParams: {
        ...quoteParams,
        destToken: moneyToken,
        destWalletAddress: undefined,
      },
      insufficientBalance: false,
      insufficientNativeReserveError: false,
    });

    expect(result?.destWalletAddress).toBe(walletAddress);
  });
});
