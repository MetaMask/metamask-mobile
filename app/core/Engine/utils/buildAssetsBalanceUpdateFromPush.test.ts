import {
  buildAssetsBalanceUpdateFromPush,
  type BalanceUpdatedPushPayload,
} from './buildAssetsBalanceUpdateFromPush';

const ACCOUNT_ID = 'account-1';
const USDC_BASE =
  'eip155:8453/erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
const ETH_BASE = 'eip155:8453/slip44:60';

const createPayload = (
  updates: BalanceUpdatedPushPayload['updates'],
): BalanceUpdatedPushPayload => ({
  address: '0xabc',
  chain: 'eip155:8453',
  updates,
});

describe('buildAssetsBalanceUpdateFromPush', () => {
  it('converts a hex minimal-unit amount to a human-readable decimal', () => {
    const payload = createPayload([
      {
        asset: { type: USDC_BASE, unit: 'USDC', decimals: 6 },
        postBalance: { amount: '0xf4240' },
      },
    ]);

    const result = buildAssetsBalanceUpdateFromPush(payload, ACCOUNT_ID);

    expect(result?.assetsBalance[ACCOUNT_ID][USDC_BASE]).toEqual({
      amount: '1',
    });
  });

  it('converts a decimal minimal-unit string to a human-readable decimal', () => {
    const payload = createPayload([
      {
        asset: { type: USDC_BASE, unit: 'USDC', decimals: 6 },
        postBalance: { amount: '2552549' },
      },
    ]);

    const result = buildAssetsBalanceUpdateFromPush(payload, ACCOUNT_ID);

    expect(result?.assetsBalance[ACCOUNT_ID][USDC_BASE]).toEqual({
      amount: '2.552549',
    });
  });

  it('marks slip44 assets as native and erc20 assets accordingly', () => {
    const payload = createPayload([
      {
        asset: { type: ETH_BASE, unit: 'ETH', decimals: 18 },
        postBalance: { amount: '0xde0b6b3a7640000' },
      },
      {
        asset: { type: USDC_BASE, unit: 'USDC', decimals: 6 },
        postBalance: { amount: '1500000' },
      },
    ]);

    const result = buildAssetsBalanceUpdateFromPush(payload, ACCOUNT_ID);

    expect(result?.assetsInfo[ETH_BASE].type).toBe('native');
    expect(result?.assetsInfo[USDC_BASE].type).toBe('erc20');
  });

  it('uses the asset unit for symbol and name', () => {
    const payload = createPayload([
      {
        asset: { type: USDC_BASE, unit: 'USDC', decimals: 6 },
        postBalance: { amount: '1000000' },
      },
    ]);

    const result = buildAssetsBalanceUpdateFromPush(payload, ACCOUNT_ID);

    expect(result?.assetsInfo[USDC_BASE]).toEqual({
      type: 'erc20',
      symbol: 'USDC',
      name: 'USDC',
      decimals: 6,
    });
  });

  it('defaults symbol and name to an empty string when the unit is missing', () => {
    const payload = createPayload([
      {
        asset: { type: USDC_BASE, decimals: 6 },
        postBalance: { amount: '1000000' },
      },
    ]);

    const result = buildAssetsBalanceUpdateFromPush(payload, ACCOUNT_ID);

    expect(result?.assetsInfo[USDC_BASE].symbol).toBe('');
    expect(result?.assetsInfo[USDC_BASE].name).toBe('');
  });

  it('merges multiple updates under the same account id', () => {
    const payload = createPayload([
      {
        asset: { type: ETH_BASE, unit: 'ETH', decimals: 18 },
        postBalance: { amount: '0xde0b6b3a7640000' },
      },
      {
        asset: { type: USDC_BASE, unit: 'USDC', decimals: 6 },
        postBalance: { amount: '2552549' },
      },
    ]);

    const result = buildAssetsBalanceUpdateFromPush(payload, ACCOUNT_ID);

    expect(result).toEqual({
      updateMode: 'merge',
      assetsBalance: {
        [ACCOUNT_ID]: {
          [ETH_BASE]: { amount: '1' },
          [USDC_BASE]: { amount: '2.552549' },
        },
      },
      assetsInfo: {
        [ETH_BASE]: {
          type: 'native',
          symbol: 'ETH',
          name: 'ETH',
          decimals: 18,
        },
        [USDC_BASE]: {
          type: 'erc20',
          symbol: 'USDC',
          name: 'USDC',
          decimals: 6,
        },
      },
    });
  });

  it('skips updates missing an asset id, decimals, or amount', () => {
    const payload = createPayload([
      { asset: { unit: 'USDC', decimals: 6 }, postBalance: { amount: '1' } },
      {
        asset: { type: USDC_BASE, unit: 'USDC' },
        postBalance: { amount: '1' },
      },
      { asset: { type: ETH_BASE, unit: 'ETH', decimals: 18 }, postBalance: {} },
    ]);

    const result = buildAssetsBalanceUpdateFromPush(payload, ACCOUNT_ID);

    expect(result).toBeNull();
  });

  it('skips an entry with null decimals while keeping valid entries in the same push', () => {
    const payload = createPayload([
      {
        asset: {
          type: ETH_BASE,
          unit: 'ETH',
          decimals: null as unknown as number,
        },
        postBalance: { amount: '0xde0b6b3a7640000' },
      },
      {
        asset: { type: USDC_BASE, unit: 'USDC', decimals: 6 },
        postBalance: { amount: '2552549' },
      },
    ]);

    const result = buildAssetsBalanceUpdateFromPush(payload, ACCOUNT_ID);

    expect(result?.assetsBalance[ACCOUNT_ID]).toEqual({
      [USDC_BASE]: { amount: '2.552549' },
    });
    expect(result?.assetsInfo).not.toHaveProperty(ETH_BASE);
  });

  it('skips an entry whose amount cannot be converted while keeping valid entries', () => {
    const payload = createPayload([
      {
        asset: { type: ETH_BASE, unit: 'ETH', decimals: 18 },
        postBalance: { amount: 'not-a-number' },
      },
      {
        asset: { type: USDC_BASE, unit: 'USDC', decimals: 6 },
        postBalance: { amount: '1000000' },
      },
    ]);

    const result = buildAssetsBalanceUpdateFromPush(payload, ACCOUNT_ID);

    expect(result?.assetsBalance[ACCOUNT_ID]).toEqual({
      [USDC_BASE]: { amount: '1' },
    });
    expect(result?.assetsInfo).not.toHaveProperty(ETH_BASE);
  });

  it('skips entries with a non-string amount', () => {
    const payload = createPayload([
      {
        asset: { type: USDC_BASE, unit: 'USDC', decimals: 6 },
        postBalance: { amount: 1000000 as unknown as string },
      },
    ]);

    const result = buildAssetsBalanceUpdateFromPush(payload, ACCOUNT_ID);

    expect(result).toBeNull();
  });

  it('returns null when updates is not an array', () => {
    const payload = {
      address: '0xabc',
      chain: 'eip155:8453',
      updates: undefined,
    } as unknown as BalanceUpdatedPushPayload;

    const result = buildAssetsBalanceUpdateFromPush(payload, ACCOUNT_ID);

    expect(result).toBeNull();
  });

  it('returns null when no applicable updates remain', () => {
    const payload = createPayload([]);

    const result = buildAssetsBalanceUpdateFromPush(payload, ACCOUNT_ID);

    expect(result).toBeNull();
  });
});
