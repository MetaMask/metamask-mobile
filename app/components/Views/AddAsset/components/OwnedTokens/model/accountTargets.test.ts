import {
  OWNED_TOKENS_ACCOUNT_CHUNK_SIZE,
  buildOwnedTokenAccountTargets,
  chunkList,
} from './accountTargets';
import { fetchOwnedTokenBalancesInChunks } from './fetchOwnedTokenBalances';
import type { V6BalancesResponse } from '@metamask/core-backend';

describe('buildOwnedTokenAccountTargets', () => {
  it('crosses an EVM wildcard scope with enabled chains and skips other namespaces', () => {
    const targets = buildOwnedTokenAccountTargets(
      [
        {
          id: 'evm-1',
          address: '0xABC',
          scopes: ['eip155:0'],
          name: 'EVM',
        },
        {
          id: 'sol-1',
          address: 'SoLAddresS',
          scopes: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
          name: 'Sol',
        },
      ],
      ['eip155:1', 'eip155:137', 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
    );

    expect(targets.map((target) => target.caipAccountId)).toEqual([
      'eip155:1:0xabc',
      'eip155:137:0xabc',
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:SoLAddresS',
    ]);
    expect(targets[2]?.internalAccountId).toBe('sol-1');
  });

  it('chunks account ids at the safe request size', () => {
    const ids = Array.from({ length: 25 }, (_item, index) => `id-${index}`);

    const chunks = chunkList(ids, OWNED_TOKENS_ACCOUNT_CHUNK_SIZE);

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(20);
    expect(chunks[1]).toHaveLength(5);
  });
});

describe('fetchOwnedTokenBalancesInChunks', () => {
  const empty = (networks: string[]): V6BalancesResponse => ({
    balances: [],
    unprocessedNetworks: networks,
    unprocessedIncludeAssetIds: [],
  });

  it('runs chunks in parallel and unions unprocessed networks', async () => {
    const calls: string[][] = [];
    const signal = new AbortController().signal;

    const result = await fetchOwnedTokenBalancesInChunks({
      accountIds: Array.from(
        { length: 25 },
        (_item, index) => `eip155:1:0x${index}`,
      ),
      vsCurrency: 'usd',
      signal,
      sequential: false,
      fetchChunk: async (ids, networks) => {
        calls.push([...ids]);
        return empty(networks[0] ? [networks[0]] : []);
      },
    });

    expect(calls).toHaveLength(2);
    expect(result.unprocessedNetworks).toEqual(['eip155:1']);
  });

  it('runs chunks one at a time when sequential is set', async () => {
    let active = 0;
    let maxActive = 0;

    await fetchOwnedTokenBalancesInChunks({
      accountIds: Array.from(
        { length: 21 },
        (_item, index) => `eip155:1:0x${index}`,
      ),
      vsCurrency: 'eur',
      signal: new AbortController().signal,
      sequential: true,
      fetchChunk: async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await Promise.resolve();
        active -= 1;
        return empty([]);
      },
    });

    expect(maxActive).toBe(1);
  });
});
