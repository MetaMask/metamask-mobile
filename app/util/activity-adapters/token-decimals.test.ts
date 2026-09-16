import { getHumanReadableTokenAmount } from './fiat';
import {
  createActivityTokenNormalizer,
  type KnownTokensByChainAndAccount,
} from './token-decimals';
import type { ActivityListItem, TokenAmount } from './types';

// Arbitrum USDT — deliberately absent from the adapters' static token lists, so
// only the user's imported tokens can resolve its decimals.
const ARBITRUM = 'eip155:42161';
const ARBITRUM_HEX = '0xa4b1';
const USDT_ARBITRUM = '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9';
const USDT_ARBITRUM_ASSET_ID = `${ARBITRUM}/erc20:${USDT_ARBITRUM}`;

// BSC USDT is in BRIDGE_CHAINID_COMMON_TOKEN_PAIR, covering the static fallback.
const BSC = 'eip155:56';
const USDT_BSC = '0x55d398326f99059fF775485246999027B3197955';

const ACCOUNT = '0x1111111111111111111111111111111111111111';
const OTHER_ACCOUNT = '0x2222222222222222222222222222222222222222';

const importedUsdt: KnownTokensByChainAndAccount = {
  [ARBITRUM_HEX]: {
    [ACCOUNT]: [
      { address: USDT_ARBITRUM.toLowerCase(), symbol: 'USDT', decimals: 6 },
    ],
  },
};

const makeSend = (
  token: TokenAmount,
  chainId: string = ARBITRUM,
): ActivityListItem =>
  ({
    type: 'send',
    chainId,
    status: 'success',
    timestamp: 0,
    hash: '0xhash',
    data: { from: ACCOUNT, to: OTHER_ACCOUNT, token },
  }) as unknown as ActivityListItem;

const getToken = (item: ActivityListItem): TokenAmount =>
  (item.data as { token: TokenAmount }).token;

describe('createActivityTokenNormalizer', () => {
  it('leaves an enriched token untouched', () => {
    const item = makeSend({
      direction: 'out',
      amount: '167121100',
      decimals: 6,
      symbol: 'USDT',
      assetId: USDT_ARBITRUM_ASSET_ID,
      assetType: 'erc20',
    });

    expect(createActivityTokenNormalizer(importedUsdt)(item)).toBe(item);
  });

  it('resolves missing decimals and symbol from the imported tokens', () => {
    const item = makeSend({
      direction: 'out',
      amount: '167121100',
      assetId: USDT_ARBITRUM_ASSET_ID,
      assetType: 'erc20',
    });

    expect(getToken(createActivityTokenNormalizer(importedUsdt)(item))).toEqual(
      {
        direction: 'out',
        amount: '167121100',
        decimals: 6,
        symbol: 'USDT',
        assetId: USDT_ARBITRUM_ASSET_ID,
        assetType: 'erc20',
      },
    );
  });

  it('finds the token entry under any account on the chain', () => {
    const knownTokens: KnownTokensByChainAndAccount = {
      [ARBITRUM_HEX]: {
        [ACCOUNT]: [{ address: '0xunrelated' }],
        [OTHER_ACCOUNT]: [{ address: USDT_ARBITRUM, decimals: 6 }],
      },
    };
    const item = makeSend({
      direction: 'out',
      amount: '167121100',
      assetId: USDT_ARBITRUM_ASSET_ID,
      assetType: 'erc20',
    });

    expect(
      getToken(createActivityTokenNormalizer(knownTokens)(item)).decimals,
    ).toBe(6);
  });

  it('falls back to static token metadata when the token is not imported', () => {
    const item = makeSend(
      {
        direction: 'out',
        amount: '13840',
        assetId: `${BSC}/erc20:${USDT_BSC}`,
        assetType: 'erc20',
      },
      BSC,
    );

    expect(
      getToken(createActivityTokenNormalizer(undefined)(item)),
    ).toMatchObject({
      amount: '13840',
      decimals: 18,
      symbol: 'USDT',
    });
  });

  it('leaves an amount whose decimals cannot be resolved for the display layer to suppress', () => {
    const item = makeSend({
      direction: 'out',
      amount: '167121100',
      symbol: 'USDT',
      assetId: USDT_ARBITRUM_ASSET_ID,
      assetType: 'erc20',
    });

    const token = getToken(createActivityTokenNormalizer(undefined)(item));

    expect(token.decimals).toBeUndefined();
    expect(getHumanReadableTokenAmount(token)).toBeUndefined();
  });

  it('marks an unresolved local ERC-20 amount so the display layer can suppress it', () => {
    // The local mapper omits `assetType`, so without it an unscalable amount
    // is indistinguishable from an already-human one.
    const item = makeSend({
      direction: 'out',
      amount: '167121100',
      symbol: 'USDT',
      assetId: USDT_ARBITRUM_ASSET_ID,
    });

    const token = getToken(createActivityTokenNormalizer(undefined)(item));

    expect(token).toMatchObject({ amount: '167121100', assetType: 'erc20' });
    expect(getHumanReadableTokenAmount(token)).toBeUndefined();
  });

  it('defaults a native amount with no decimals to the chain native decimals', () => {
    const item = makeSend(
      {
        direction: 'out',
        amount: '1000000000000000',
        assetType: 'native',
        assetId: 'eip155:1/slip44:60',
      },
      'eip155:1',
    );

    expect(
      getToken(createActivityTokenNormalizer(undefined)(item)),
    ).toMatchObject({
      amount: '1000000000000000',
      decimals: 18,
      symbol: 'ETH',
    });
  });

  it('normalizes each swap leg independently', () => {
    const item = {
      type: 'swap',
      chainId: ARBITRUM,
      status: 'success',
      timestamp: 0,
      hash: '0xhash',
      data: {
        sourceToken: {
          direction: 'out',
          amount: '167121100',
          assetId: USDT_ARBITRUM_ASSET_ID,
          assetType: 'erc20',
        },
        destinationToken: {
          direction: 'in',
          amount: '745600000000000',
          decimals: 18,
          symbol: 'ETH',
          assetType: 'native',
        },
      },
    } as unknown as ActivityListItem;

    const data = createActivityTokenNormalizer(importedUsdt)(item).data as {
      sourceToken: TokenAmount;
      destinationToken: TokenAmount;
    };

    expect(data.sourceToken.decimals).toBe(6);
    expect(data.destinationToken.decimals).toBe(18);
  });

  it('leaves NFT amounts untouched — an ERC-1155 amount is a count, not base units', () => {
    const item = makeSend({
      direction: 'out',
      amount: '3',
      symbol: 'CoolCat',
      assetId: `${ARBITRUM}/erc1155:0xabc/1`,
      assetType: 'erc1155',
    });

    expect(createActivityTokenNormalizer(undefined)(item)).toBe(item);
  });

  it('leaves items with no resolvable token amounts untouched', () => {
    const noAmount = makeSend({
      direction: 'out',
      symbol: 'USDT',
      assetId: USDT_ARBITRUM_ASSET_ID,
      assetType: 'erc20',
    });
    expect(createActivityTokenNormalizer(undefined)(noAmount)).toBe(noAmount);

    const noToken = {
      type: 'contractInteraction',
      chainId: ARBITRUM,
      status: 'success',
      timestamp: 0,
      data: { to: OTHER_ACCOUNT },
    } as unknown as ActivityListItem;
    expect(createActivityTokenNormalizer(undefined)(noToken)).toBe(noToken);
  });
});
