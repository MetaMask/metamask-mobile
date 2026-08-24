import { normalizeActivityItemTokenDecimals } from './normalize-token-decimals';
import { mobileActivityAdapterEnvironment } from './environment';
import type { ActivityListItem } from '../types';

describe('normalizeActivityItemTokenDecimals', () => {
  const chainId = 'eip155:42161' as const;
  const contractAddress = '0x000000000000000000000000000000000000dead';
  const assetId = `${chainId}/erc20:${contractAddress}` as const;

  const makeEnvironment = (hostDecimals?: number) => ({
    ...mobileActivityAdapterEnvironment,
    getKnownTokenDecimals: jest.fn().mockReturnValue(hostDecimals),
  });

  const makeSendItem = (token: Record<string, unknown>): ActivityListItem =>
    ({
      type: 'send',
      chainId,
      status: 'success',
      timestamp: 0,
      hash: '0xhash',
      data: { from: '0xa', to: '0xb', token },
    }) as unknown as ActivityListItem;

  it('leaves enriched tokens untouched (same item reference)', () => {
    const item = makeSendItem({
      direction: 'out',
      amount: '167121100',
      decimals: 6,
      symbol: 'USDT',
      assetId,
    });

    expect(normalizeActivityItemTokenDecimals(item, makeEnvironment())).toBe(
      item,
    );
  });

  it('resolves missing decimals from the host token entries', () => {
    const environment = makeEnvironment(6);
    const item = makeSendItem({
      direction: 'out',
      amount: '167121100',
      symbol: 'USDT',
      assetId,
    });

    const result = normalizeActivityItemTokenDecimals(item, environment);

    expect(environment.getKnownTokenDecimals).toHaveBeenCalledWith(
      chainId,
      contractAddress,
    );
    expect(
      (result.data as { token: { decimals?: number; amount?: string } }).token,
    ).toMatchObject({ amount: '167121100', decimals: 6 });
  });

  it('omits the raw amount when decimals cannot be resolved', () => {
    const item = makeSendItem({
      direction: 'out',
      amount: '167121100',
      symbol: 'USDT',
      assetId,
    });

    const result = normalizeActivityItemTokenDecimals(
      item,
      makeEnvironment(undefined),
    );
    const token = (
      result.data as {
        token: { decimals?: number; amount?: string; symbol?: string };
      }
    ).token;

    expect(token.amount).toBeUndefined();
    expect(token.decimals).toBeUndefined();
    expect(token.symbol).toBe('USDT');
  });

  it('defaults native amounts to 18 decimals', () => {
    const item = makeSendItem({
      direction: 'out',
      amount: '1000000000000000',
      symbol: 'ETH',
      assetType: 'native',
      assetId: `${chainId}/slip44:60`,
    });

    const result = normalizeActivityItemTokenDecimals(
      item,
      makeEnvironment(undefined),
    );

    expect(
      (result.data as { token: { decimals?: number } }).token.decimals,
    ).toBe(18);
  });

  it('normalizes nested swap legs independently', () => {
    const environment = makeEnvironment(6);
    const item = {
      type: 'swap',
      chainId,
      status: 'success',
      timestamp: 0,
      hash: '0xhash',
      data: {
        sourceToken: { direction: 'out', amount: '1714557', assetId },
        destinationToken: {
          direction: 'in',
          amount: '745600000000000',
          decimals: 18,
          symbol: 'ETH',
        },
      },
    } as unknown as ActivityListItem;

    const result = normalizeActivityItemTokenDecimals(item, environment);
    const data = result.data as {
      sourceToken: { decimals?: number };
      destinationToken: { decimals?: number };
    };

    expect(data.sourceToken.decimals).toBe(6);
    expect(data.destinationToken.decimals).toBe(18);
  });

  it('skips NFT token amounts', () => {
    const item = makeSendItem({
      direction: 'out',
      amount: '1',
      assetType: 'erc721',
      symbol: 'CoolCat',
    });

    expect(normalizeActivityItemTokenDecimals(item, makeEnvironment())).toBe(
      item,
    );
  });
});
