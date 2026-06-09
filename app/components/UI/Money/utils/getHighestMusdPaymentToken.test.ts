import { CHAIN_IDS } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { getHighestMusdPaymentToken } from './getHighestMusdPaymentToken';
import { MUSD_TOKEN_ADDRESS_BY_CHAIN } from '../../Earn/constants/musd';

describe('getHighestMusdPaymentToken', () => {
  it('returns undefined when there are no balances', () => {
    expect(getHighestMusdPaymentToken({})).toBeUndefined();
  });

  it('returns the mUSD token on the only chain with a balance', () => {
    const result = getHighestMusdPaymentToken({
      [CHAIN_IDS.MAINNET]: '12.5',
    } as Record<Hex, string>);

    expect(result).toEqual({
      address: MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.MAINNET],
      chainId: CHAIN_IDS.MAINNET,
    });
  });

  it('returns the mUSD token on the chain with the highest balance', () => {
    const result = getHighestMusdPaymentToken({
      [CHAIN_IDS.MAINNET]: '5',
      [CHAIN_IDS.LINEA_MAINNET]: '42.1',
    } as Record<Hex, string>);

    expect(result).toEqual({
      address: MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.LINEA_MAINNET],
      chainId: CHAIN_IDS.LINEA_MAINNET,
    });
  });

  it('ignores chains with non-numeric balances', () => {
    const result = getHighestMusdPaymentToken({
      [CHAIN_IDS.MAINNET]: 'not-a-number',
      [CHAIN_IDS.LINEA_MAINNET]: '1',
    } as Record<Hex, string>);

    expect(result).toEqual({
      address: MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.LINEA_MAINNET],
      chainId: CHAIN_IDS.LINEA_MAINNET,
    });
  });

  it('returns undefined when all balances are zero', () => {
    expect(
      getHighestMusdPaymentToken({
        [CHAIN_IDS.MAINNET]: '0',
        [CHAIN_IDS.LINEA_MAINNET]: '0',
      } as Record<Hex, string>),
    ).toBeUndefined();
  });

  it('returns undefined when the highest-balance chain has no mUSD address', () => {
    expect(
      getHighestMusdPaymentToken({
        '0xdeadbeef': '100',
      } as Record<Hex, string>),
    ).toBeUndefined();
  });
});
