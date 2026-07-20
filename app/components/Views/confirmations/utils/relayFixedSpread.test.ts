import {
  EMPTY_RELAY_FIXED_SPREAD_CONFIG,
  getRelayFixedSpreadFromConfig,
  getRelayFixedSpreadRoutesWithSymbols,
  isSubsidizedRoute,
  isSubsidizedSource,
} from './relayFixedSpread';

const ETH_USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const ETH_MUSD = '0xaca92e438df0b2401ff60da7e4337b687a2435da';
const LINEA_USDC = '0x176211869ca2b568f2a7d4ee941e073a821ee1ff';
const MONAD_USDC = '0x754704bc059f8c67012fed69bc8a327a5aafb603';

const FLAG_NAME = 'confirmations_relay_fixed_spread';

const withRoutes = (routes: unknown[]) => ({
  chains: { eth: '0x1' },
  tokens: { eth_usdc: ETH_USDC, musd: ETH_MUSD },
  routes,
});

const samplePayload = withRoutes([['eth', 'eth_usdc', 'eth', 'musd']]);

const expectedRoute = {
  sourceChain: '0x1',
  sourceToken: ETH_USDC,
  targetChain: '0x1',
  targetToken: ETH_MUSD,
};

describe('getRelayFixedSpreadFromConfig', () => {
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleWarnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it('resolves aliases into normalised routes when remote value is a valid object', () => {
    const result = getRelayFixedSpreadFromConfig(samplePayload, FLAG_NAME);

    expect(result.routes).toEqual([expectedRoute]);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('parses remote value provided as a JSON string', () => {
    const result = getRelayFixedSpreadFromConfig(
      JSON.stringify(samplePayload),
      FLAG_NAME,
    );

    expect(result.routes).toEqual([expectedRoute]);
  });

  it('lowercases mixed-case addresses and chain ids on resolution', () => {
    const result = getRelayFixedSpreadFromConfig(
      {
        chains: { linea: '0xE708' },
        tokens: {
          linea_usdc: '0x176211869CA2B568F2A7D4EE941E073A821EE1FF',
          musd: '0xACA92E438DF0B2401FF60DA7E4337B687A2435DA',
        },
        routes: [['linea', 'linea_usdc', 'linea', 'musd']],
      },
      FLAG_NAME,
    );

    expect(result.routes).toEqual([
      {
        sourceChain: '0xe708',
        sourceToken: LINEA_USDC,
        targetChain: '0xe708',
        targetToken: ETH_MUSD,
      },
    ]);
  });

  it('drops routes referencing an unknown chain alias', () => {
    const result = getRelayFixedSpreadFromConfig(
      withRoutes([
        ['eth', 'eth_usdc', 'eth', 'musd'],
        ['mystery_chain', 'eth_usdc', 'eth', 'musd'],
      ]),
      FLAG_NAME,
    );

    expect(result.routes).toEqual([expectedRoute]);
  });

  it('drops routes referencing an unknown token alias', () => {
    const result = getRelayFixedSpreadFromConfig(
      withRoutes([
        ['eth', 'eth_usdc', 'eth', 'musd'],
        ['eth', 'mystery_token', 'eth', 'musd'],
      ]),
      FLAG_NAME,
    );

    expect(result.routes).toEqual([expectedRoute]);
  });

  it('drops routes that are not 4-tuples of strings', () => {
    const result = getRelayFixedSpreadFromConfig(
      withRoutes([
        ['eth', 'eth_usdc', 'eth', 'musd'],
        ['eth', 'eth_usdc', 'eth'],
        ['eth', 'eth_usdc', 'eth', 'musd', 'extra'],
        ['eth', 42, 'eth', 'musd'],
        null,
        'not-an-array',
      ]),
      FLAG_NAME,
    );

    expect(result.routes).toEqual([expectedRoute]);
  });

  it('silently skips alias entries whose value is not a hex string', () => {
    const result = getRelayFixedSpreadFromConfig(
      {
        chains: { eth: '0x1', bad_chain: 'not-hex' },
        tokens: {
          eth_usdc: ETH_USDC,
          musd: ETH_MUSD,
          bad_token: 'not-hex',
        },
        routes: [
          ['eth', 'eth_usdc', 'eth', 'musd'],
          ['bad_chain', 'eth_usdc', 'eth', 'musd'],
          ['eth', 'bad_token', 'eth', 'musd'],
        ],
      },
      FLAG_NAME,
    );

    expect(result.routes).toEqual([expectedRoute]);
  });

  it('ignores unused alias entries', () => {
    const result = getRelayFixedSpreadFromConfig(
      {
        chains: { eth: '0x1', linea: '0xe708' },
        tokens: {
          eth_usdc: ETH_USDC,
          musd: ETH_MUSD,
          unused_token: LINEA_USDC,
        },
        routes: [['eth', 'eth_usdc', 'eth', 'musd']],
      },
      FLAG_NAME,
    );

    expect(result.routes).toEqual([expectedRoute]);
  });

  it('warns and returns empty when remote JSON is malformed', () => {
    const result = getRelayFixedSpreadFromConfig('{not-valid-json', FLAG_NAME);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to parse remote'),
    );
    expect(result).toEqual(EMPTY_RELAY_FIXED_SPREAD_CONFIG);
  });

  it('warns and returns empty when chains map is missing', () => {
    const result = getRelayFixedSpreadFromConfig(
      {
        tokens: { eth_usdc: ETH_USDC, musd: ETH_MUSD },
        routes: [['eth', 'eth_usdc', 'eth', 'musd']],
      },
      FLAG_NAME,
    );

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('produced invalid structure'),
    );
    expect(result).toEqual(EMPTY_RELAY_FIXED_SPREAD_CONFIG);
  });

  it('warns and returns empty when tokens map is missing', () => {
    const result = getRelayFixedSpreadFromConfig(
      {
        chains: { eth: '0x1' },
        routes: [['eth', 'eth_usdc', 'eth', 'musd']],
      },
      FLAG_NAME,
    );

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('produced invalid structure'),
    );
    expect(result).toEqual(EMPTY_RELAY_FIXED_SPREAD_CONFIG);
  });

  it('warns and returns empty when routes is not an array', () => {
    const result = getRelayFixedSpreadFromConfig(
      { ...withRoutes([]), routes: 'not-an-array' },
      FLAG_NAME,
    );

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('produced invalid structure'),
    );
    expect(result).toEqual(EMPTY_RELAY_FIXED_SPREAD_CONFIG);
  });

  it('returns empty routes when payload has an empty routes array', () => {
    const result = getRelayFixedSpreadFromConfig(withRoutes([]), FLAG_NAME);

    expect(result).toEqual(EMPTY_RELAY_FIXED_SPREAD_CONFIG);
  });

  it('returns empty without warning when remote is undefined', () => {
    const result = getRelayFixedSpreadFromConfig(undefined, FLAG_NAME);

    expect(result).toEqual(EMPTY_RELAY_FIXED_SPREAD_CONFIG);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('returns empty without warning when remote is null', () => {
    const result = getRelayFixedSpreadFromConfig(null, FLAG_NAME);

    expect(result).toEqual(EMPTY_RELAY_FIXED_SPREAD_CONFIG);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('returns empty without warning when remote is empty string', () => {
    const result = getRelayFixedSpreadFromConfig('', FLAG_NAME);

    expect(result).toEqual(EMPTY_RELAY_FIXED_SPREAD_CONFIG);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });
});

describe('getRelayFixedSpreadRoutesWithSymbols', () => {
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleWarnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it('resolves aliases and preserves token alias fields from object input', () => {
    const result = getRelayFixedSpreadRoutesWithSymbols(
      samplePayload,
      FLAG_NAME,
    );

    expect(result).toEqual([
      {
        sourceChain: '0x1',
        sourceTokenAlias: 'eth_usdc',
        sourceToken: ETH_USDC,
        targetChain: '0x1',
        targetTokenAlias: 'musd',
        targetToken: ETH_MUSD,
      },
    ]);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('drops malformed tuples that are not 4-tuples of strings', () => {
    const result = getRelayFixedSpreadRoutesWithSymbols(
      withRoutes([
        ['eth', 'eth_usdc', 'eth', 'musd'],
        ['eth', 'eth_usdc', 'eth'],
        ['eth', 'eth_usdc', 'eth', 'musd', 'extra'],
        ['eth', 42, 'eth', 'musd'],
        null,
        'not-an-array',
      ]),
      FLAG_NAME,
    );

    expect(result).toEqual([
      {
        sourceChain: '0x1',
        sourceTokenAlias: 'eth_usdc',
        sourceToken: ETH_USDC,
        targetChain: '0x1',
        targetTokenAlias: 'musd',
        targetToken: ETH_MUSD,
      },
    ]);
  });

  it('drops routes that reference unknown chain or token aliases', () => {
    const result = getRelayFixedSpreadRoutesWithSymbols(
      withRoutes([
        ['eth', 'eth_usdc', 'eth', 'musd'],
        ['mystery_chain', 'eth_usdc', 'eth', 'musd'],
        ['eth', 'mystery_token', 'eth', 'musd'],
      ]),
      FLAG_NAME,
    );

    expect(result).toEqual([
      {
        sourceChain: '0x1',
        sourceTokenAlias: 'eth_usdc',
        sourceToken: ETH_USDC,
        targetChain: '0x1',
        targetTokenAlias: 'musd',
        targetToken: ETH_MUSD,
      },
    ]);
  });

  it('returns empty without warning when remote is undefined, null, or empty string', () => {
    expect(getRelayFixedSpreadRoutesWithSymbols(undefined, FLAG_NAME)).toEqual(
      [],
    );
    expect(getRelayFixedSpreadRoutesWithSymbols(null, FLAG_NAME)).toEqual([]);
    expect(getRelayFixedSpreadRoutesWithSymbols('', FLAG_NAME)).toEqual([]);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('warns and returns empty when remote JSON is malformed', () => {
    const result = getRelayFixedSpreadRoutesWithSymbols(
      '{not-valid-json',
      FLAG_NAME,
    );

    expect(result).toEqual([]);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to parse remote'),
    );
  });

  it('warns and returns empty when shape is invalid', () => {
    const result = getRelayFixedSpreadRoutesWithSymbols(
      {
        tokens: { eth_usdc: ETH_USDC, musd: ETH_MUSD },
        routes: [['eth', 'eth_usdc', 'eth', 'musd']],
      },
      FLAG_NAME,
    );

    expect(result).toEqual([]);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('produced invalid structure'),
    );
  });
});

describe('isSubsidizedSource', () => {
  const config = {
    routes: [
      {
        sourceChain: '0x1' as const,
        sourceToken: ETH_USDC as `0x${string}`,
        targetChain: '0x1' as const,
        targetToken: ETH_MUSD as `0x${string}`,
      },
      {
        sourceChain: '0x8f' as const,
        sourceToken: MONAD_USDC as `0x${string}`,
        targetChain: '0x8f' as const,
        targetToken: ETH_MUSD as `0x${string}`,
      },
    ],
  };

  it('returns true when (chainId, address) matches a route source', () => {
    expect(
      isSubsidizedSource(config, { chainId: '0x1', address: ETH_USDC }),
    ).toBe(true);
    expect(
      isSubsidizedSource(config, { chainId: '0x8f', address: MONAD_USDC }),
    ).toBe(true);
  });

  it('returns false when address does not match', () => {
    expect(
      isSubsidizedSource(config, { chainId: '0x1', address: LINEA_USDC }),
    ).toBe(false);
  });

  it('returns false when chainId does not match', () => {
    expect(
      isSubsidizedSource(config, { chainId: '0x2105', address: ETH_USDC }),
    ).toBe(false);
  });

  it('is case-insensitive on address and chainId', () => {
    expect(
      isSubsidizedSource(config, {
        chainId: '0X1',
        address: ETH_USDC.toUpperCase(),
      }),
    ).toBe(true);
  });

  it('returns false on empty config', () => {
    expect(
      isSubsidizedSource(EMPTY_RELAY_FIXED_SPREAD_CONFIG, {
        chainId: '0x1',
        address: ETH_USDC,
      }),
    ).toBe(false);
  });
});

describe('isSubsidizedRoute', () => {
  const config = {
    routes: [
      {
        sourceChain: '0x1' as const,
        sourceToken: ETH_USDC as `0x${string}`,
        targetChain: '0x8f' as const,
        targetToken: ETH_MUSD as `0x${string}`,
      },
    ],
  };

  it('returns true when source and target both match', () => {
    expect(
      isSubsidizedRoute(
        config,
        { chainId: '0x1', address: ETH_USDC },
        { chainId: '0x8f', address: ETH_MUSD },
      ),
    ).toBe(true);
  });

  it('returns false when only the source matches', () => {
    expect(
      isSubsidizedRoute(
        config,
        { chainId: '0x1', address: ETH_USDC },
        { chainId: '0x1', address: ETH_MUSD },
      ),
    ).toBe(false);
  });

  it('returns false when only the target matches', () => {
    expect(
      isSubsidizedRoute(
        config,
        { chainId: '0x8f', address: MONAD_USDC },
        { chainId: '0x8f', address: ETH_MUSD },
      ),
    ).toBe(false);
  });

  it('is case-insensitive on all four fields', () => {
    expect(
      isSubsidizedRoute(
        config,
        { chainId: '0X1', address: ETH_USDC.toUpperCase() },
        { chainId: '0X8F', address: ETH_MUSD.toUpperCase() },
      ),
    ).toBe(true);
  });
});
