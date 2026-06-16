import {
  createRotatingSet,
  getFallbackAssetImageUrls,
} from './AssetLogo.utils';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const ETHEREUM_HEX_CHAIN_ID = '0x1';
const ETHEREUM_CAIP_CHAIN_ID = 'eip155:1';

describe('getFallbackAssetImageUrls', () => {
  const undefinedResultCases = [
    {
      description: 'chainId is undefined',
      chainId: undefined,
      address: USDC_ADDRESS,
    },
    {
      description: 'chainId is neither caip nor hex',
      chainId: 'mainnet',
      address: USDC_ADDRESS,
    },
    {
      description: 'address is not valid hex on an EVM chain',
      chainId: ETHEREUM_HEX_CHAIN_ID,
      address: 'not-an-address',
    },
  ] as const;

  it.each(undefinedResultCases)(
    'returns undefined when $description',
    ({ chainId, address }) => {
      const result = getFallbackAssetImageUrls(chainId, address);

      expect(result).toBeUndefined();
    },
  );

  const fallbackUrlCases = [
    { description: 'hex chainId', chainId: ETHEREUM_HEX_CHAIN_ID },
    { description: 'caip chainId', chainId: ETHEREUM_CAIP_CHAIN_ID },
  ] as const;

  it.each(fallbackUrlCases)(
    'returns lowercased and checksummed fallback urls for $description',
    ({ chainId }) => {
      const result = getFallbackAssetImageUrls(chainId, USDC_ADDRESS);

      expect(result).toEqual([
        `https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/${USDC_ADDRESS.toLowerCase()}.png`,
        `https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/${USDC_ADDRESS}.png`,
      ]);
    },
  );
});

describe('createRotatingSet', () => {
  const membershipCases = [
    { value: 'first', expected: true },
    { value: 'second', expected: true },
    { value: 'missing', expected: false },
  ] as const;

  it.each(membershipCases)(
    'has returns $expected for $value after values are added',
    ({ value, expected }) => {
      const rotatingSet = createRotatingSet<string>(3);

      rotatingSet.add('first');
      rotatingSet.add('second');

      expect(rotatingSet.has(value)).toBe(expected);
    },
  );

  it('exposes the underlying set via value', () => {
    const rotatingSet = createRotatingSet<number>(3);

    rotatingSet.add(1);
    rotatingSet.add(2);

    expect(rotatingSet.value).toEqual(new Set([1, 2]));
  });

  it('removes the oldest entry when size exceeds maxSize of $maxSize', () => {
    const testCaseConfig = {
      maxSize: 2,
      values: ['first', 'second', 'third'],
      expectedSize: 2,
      present: ['second', 'third'],
      absent: ['first'],
    };

    const rotatingSet = createRotatingSet<string>(testCaseConfig.maxSize);

    testCaseConfig.values.forEach((value) => {
      rotatingSet.add(value);
    });

    expect(rotatingSet.value.size).toBe(testCaseConfig.expectedSize);
    testCaseConfig.present.forEach((value) => {
      expect(rotatingSet.has(value)).toBe(true);
    });
    testCaseConfig.absent.forEach((value) => {
      expect(rotatingSet.has(value)).toBe(false);
    });
  });

  it('retains at most $expectedSize entries with the default maxSize', () => {
    const testCaseConfig = {
      expectedSize: 100,
      firstEvicted: 0,
      firstRetained: 1,
      lastAdded: 100,
    };

    const rotatingSet = createRotatingSet<number>();

    for (let index = 0; index <= testCaseConfig.lastAdded; index++) {
      rotatingSet.add(index);
    }

    expect(rotatingSet.value.size).toBe(testCaseConfig.expectedSize);
    expect(rotatingSet.has(testCaseConfig.firstEvicted)).toBe(false);
    expect(rotatingSet.has(testCaseConfig.firstRetained)).toBe(true);
    expect(rotatingSet.has(testCaseConfig.lastAdded)).toBe(true);
  });
});
