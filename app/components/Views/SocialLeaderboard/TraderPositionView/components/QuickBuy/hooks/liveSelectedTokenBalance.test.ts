import type { BridgeToken } from '../../../../../../UI/Bridge/types';
import { resolveLiveTokenBalance } from './liveSelectedTokenBalance';

const token = (overrides: Partial<BridgeToken> = {}): BridgeToken =>
  ({
    address: '0xABC',
    chainId: '0x1',
    decimals: 18,
    symbol: 'ETH',
    name: 'Ethereum',
    balance: '1.0',
    balanceFiat: '$2000.00',
    tokenFiatAmount: 2000,
    currencyExchangeRate: 2000,
    ...overrides,
  }) as BridgeToken;

describe('resolveLiveTokenBalance', () => {
  it('returns undefined when no token is selected', () => {
    // Arrange / Act
    const result = resolveLiveTokenBalance(undefined, [token()]);

    // Assert
    expect(result).toBeUndefined();
  });

  it('returns the matching live option balance over the selection snapshot', () => {
    // Arrange — the selected snapshot is stale; the live option holds fresh
    // balance fields for the same address:chainId.
    const selected = token({ balance: '1.0', balanceFiat: '$2000.00' });
    const liveOption = token({
      balance: '0.5',
      balanceFiat: '$1000.00',
      tokenFiatAmount: 1000,
      currencyExchangeRate: 2000,
    });

    // Act
    const result = resolveLiveTokenBalance(selected, [liveOption]);

    // Assert
    expect(result).toEqual({
      balance: '0.5',
      balanceFiat: '$1000.00',
      tokenFiatAmount: 1000,
      currencyExchangeRate: 2000,
    });
  });

  it('matches by stable key regardless of address casing', () => {
    // Arrange
    const selected = token({ address: '0xAbC' });
    const liveOption = token({ address: '0xabc', balance: '0.25' });

    // Act
    const result = resolveLiveTokenBalance(selected, [liveOption]);

    // Assert
    expect(result?.balance).toBe('0.25');
  });

  it('does not match a token on a different chain', () => {
    // Arrange — same address, different chain → not the same holding.
    const selected = token({ chainId: '0x1', balance: '1.0' });
    const otherChain = token({ chainId: '0x89', balance: '5.0' });

    // Act
    const result = resolveLiveTokenBalance(selected, [otherChain]);

    // Assert — falls back to the snapshot's own fields.
    expect(result?.balance).toBe('1.0');
  });

  it('falls back to the snapshot fields when the token is absent from the options', () => {
    // Arrange
    const selected = token({ balance: '1.0', balanceFiat: '$2000.00' });

    // Act
    const result = resolveLiveTokenBalance(selected, []);

    // Assert
    expect(result).toEqual({
      balance: '1.0',
      balanceFiat: '$2000.00',
      tokenFiatAmount: 2000,
      currencyExchangeRate: 2000,
    });
  });

  it('surfaces only balance fields, never identity fields', () => {
    // Arrange
    const selected = token();

    // Act
    const result = resolveLiveTokenBalance(selected, [selected]);

    // Assert — identity fields must not leak so callers keep their stable token
    // reference for quote fetching.
    expect(result).not.toHaveProperty('address');
    expect(result).not.toHaveProperty('chainId');
    expect(result).not.toHaveProperty('decimals');
    expect(result).not.toHaveProperty('symbol');
  });
});
