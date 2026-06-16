import {
  EMPTY_RELAY_FIXED_SPREAD_CONFIG,
  getRelayFixedSpreadFromConfig,
  isSubsidizedRoute,
  isSubsidizedSource,
} from './relayFixedSpread';

const ETH_USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const ETH_MUSD = '0xaca92e438df0b2401ff60da7e4337b687a2435da';
const LINEA_USDC = '0x176211869ca2b568f2a7d4ee941e073a821ee1ff';
const MONAD_USDC = '0x754704bc059f8c67012fed69bc8a327a5aafb603';

const FLAG_NAME = 'confirmations_relay_fixed_spread';

const sampleRoute = {
  sourceChain: '0x1',
  sourceToken: ETH_USDC,
  targetChain: '0x1',
  targetToken: ETH_MUSD,
};

const samplePayload = { routes: [sampleRoute] };

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

  it('returns parsed routes when remote value is a valid object', () => {
    const result = getRelayFixedSpreadFromConfig(samplePayload, FLAG_NAME);

    expect(result.routes).toEqual([sampleRoute]);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('parses remote value provided as a JSON string', () => {
    const result = getRelayFixedSpreadFromConfig(
      JSON.stringify(samplePayload),
      FLAG_NAME,
    );

    expect(result.routes).toEqual([sampleRoute]);
  });

  it('lowercases mixed-case addresses and chain ids', () => {
    const result = getRelayFixedSpreadFromConfig(
      {
        routes: [
          {
            sourceChain: '0xE708',
            sourceToken: '0x176211869CA2B568F2A7D4EE941E073A821EE1FF',
            targetChain: '0xE708',
            targetToken: '0xACA92E438DF0B2401FF60DA7E4337B687A2435DA',
          },
        ],
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

  it('drops invalid route entries and keeps valid ones', () => {
    const result = getRelayFixedSpreadFromConfig(
      {
        routes: [
          sampleRoute,
          { sourceChain: 'not-hex', sourceToken: ETH_USDC },
          null,
          'string-route',
          {
            sourceChain: '0x1',
            sourceToken: ETH_USDC,
            targetChain: '0x1',
            targetToken: ETH_MUSD,
            extra: 'field-ignored',
          },
        ],
      },
      FLAG_NAME,
    );

    expect(result.routes).toHaveLength(2);
    expect(result.routes[0]).toEqual(sampleRoute);
    expect(result.routes[1]).toEqual(sampleRoute);
  });

  it('warns and returns empty when remote JSON is malformed', () => {
    const result = getRelayFixedSpreadFromConfig('{not-valid-json', FLAG_NAME);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to parse remote'),
    );
    expect(result).toEqual(EMPTY_RELAY_FIXED_SPREAD_CONFIG);
  });

  it('warns and returns empty when remote is structurally invalid', () => {
    const result = getRelayFixedSpreadFromConfig(
      { routes: 'not-an-array' },
      FLAG_NAME,
    );

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('produced invalid structure'),
    );
    expect(result).toEqual(EMPTY_RELAY_FIXED_SPREAD_CONFIG);
  });

  it('warns and returns empty when remote is missing routes', () => {
    const result = getRelayFixedSpreadFromConfig(
      { somethingElse: true },
      FLAG_NAME,
    );

    expect(consoleWarnSpy).toHaveBeenCalled();
    expect(result).toEqual(EMPTY_RELAY_FIXED_SPREAD_CONFIG);
  });

  it('returns empty routes when remote payload is an empty array', () => {
    const result = getRelayFixedSpreadFromConfig({ routes: [] }, FLAG_NAME);

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
