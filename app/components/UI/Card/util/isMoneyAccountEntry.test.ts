import type { CaipChainId } from '@metamask/utils';
import { isMoneyAccountEntry } from './isMoneyAccountEntry';
import type { VedaTokenConfig } from './vedaToken';

const MONAD_CAIP: CaipChainId = 'eip155:143';
const VEDA_ADDRESS = '0xb4563bcD3B7764CCBf497f515585f70B6C3EA5Ae';

const makeVedaConfig = (
  overrides: Partial<VedaTokenConfig> = {},
): VedaTokenConfig => ({
  caipChainId: MONAD_CAIP,
  address: VEDA_ADDRESS,
  decimals: 6,
  delegationContract: '0xC7f1b2228fbf28451c7bf791C4f610111f0f32cb',
  ...overrides,
});

describe('isMoneyAccountEntry', () => {
  it('returns false when vedaConfig is null', () => {
    expect(
      isMoneyAccountEntry(
        { address: VEDA_ADDRESS, caipChainId: MONAD_CAIP },
        null,
      ),
    ).toBe(false);
  });

  it('returns false when token has no address', () => {
    expect(
      isMoneyAccountEntry({ caipChainId: MONAD_CAIP }, makeVedaConfig()),
    ).toBe(false);
  });

  it('returns false when token has no caipChainId', () => {
    expect(
      isMoneyAccountEntry({ address: VEDA_ADDRESS }, makeVedaConfig()),
    ).toBe(false);
  });

  it('returns true on exact address + chain match', () => {
    expect(
      isMoneyAccountEntry(
        { address: VEDA_ADDRESS, caipChainId: MONAD_CAIP },
        makeVedaConfig(),
      ),
    ).toBe(true);
  });

  it('matches case-insensitively on address', () => {
    expect(
      isMoneyAccountEntry(
        {
          address: VEDA_ADDRESS.toLowerCase(),
          caipChainId: MONAD_CAIP,
        },
        makeVedaConfig({ address: VEDA_ADDRESS.toUpperCase() }),
      ),
    ).toBe(true);
  });

  it('returns false when address matches but chain does not', () => {
    expect(
      isMoneyAccountEntry(
        { address: VEDA_ADDRESS, caipChainId: 'eip155:1' },
        makeVedaConfig(),
      ),
    ).toBe(false);
  });

  it('returns false when chain matches but address does not', () => {
    expect(
      isMoneyAccountEntry(
        {
          address: '0x0000000000000000000000000000000000000001',
          caipChainId: MONAD_CAIP,
        },
        makeVedaConfig(),
      ),
    ).toBe(false);
  });
});
