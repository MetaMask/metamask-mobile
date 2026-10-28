import Logger from '../../../../../../util/Logger';
import {
  resetComparableAssetKeyLogForTests,
  toComparableAssetKey,
} from './assetIdentity';

const USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const USDC_CHECKSUM = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const SOL_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const SOL_CHAIN = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

describe('toComparableAssetKey', () => {
  beforeEach(() => {
    resetComparableAssetKeyLogForTests();
    jest.spyOn(Logger, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('treats hex and decimal EVM chain references as the same asset', () => {
    const hexKey = toComparableAssetKey(`eip155:0x1/erc20:${USDC}`);
    const decimalKey = toComparableAssetKey(`eip155:1/erc20:${USDC}`);

    expect(hexKey).toBe(`eip155:1/erc20:${USDC}`);
    expect(hexKey).toBe(decimalKey);
  });

  it('treats checksummed and lowercase EVM addresses as the same asset', () => {
    const checksumKey = toComparableAssetKey(`eip155:1/erc20:${USDC_CHECKSUM}`);
    const lowercaseKey = toComparableAssetKey(`eip155:1/erc20:${USDC}`);

    expect(checksumKey).toBe(lowercaseKey);
    expect(checksumKey).toBe(`eip155:1/erc20:${USDC}`);
  });

  it('parses uppercase namespace and asset namespace segments', () => {
    const key = toComparableAssetKey(`EIP155:1/ERC20:${USDC_CHECKSUM}`);

    expect(key).toBe(`eip155:1/erc20:${USDC}`);
  });

  it('does not merge Solana mints that differ only by case', () => {
    const original = toComparableAssetKey(
      `solana:${SOL_CHAIN}/token:${SOL_MINT}`,
    );
    const differentCase = toComparableAssetKey(
      `solana:${SOL_CHAIN}/token:${SOL_MINT.toLowerCase()}`,
    );

    expect(original).toBe(`solana:${SOL_CHAIN}/token:${SOL_MINT}`);
    expect(differentCase).not.toBe(original);
  });

  it('returns undefined and logs once when the id cannot be parsed', () => {
    const first = toComparableAssetKey('not-an-asset');
    const second = toComparableAssetKey('not-an-asset');

    expect(first).toBeUndefined();
    expect(second).toBeUndefined();
    expect(Logger.log).toHaveBeenCalledTimes(1);
  });
});
