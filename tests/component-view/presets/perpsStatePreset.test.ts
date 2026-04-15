import { initialStatePerps } from './perpsStatePreset';

describe('initialStatePerps', () => {
  it('returns a builder with build method', () => {
    const builder = initialStatePerps();

    expect(typeof builder.build).toBe('function');
    expect(typeof builder.withOverrides).toBe('function');
  });

  it('builds state with PerpsController and perps feature flag enabled', () => {
    const state = initialStatePerps().build();

    const perps = state?.engine?.backgroundState?.PerpsController as
      | { isEligible?: boolean }
      | undefined;
    expect(perps).toBeDefined();
    expect(perps?.isEligible).toBe(true);
  });

  it('builds state with NetworkController and PreferencesController overrides', () => {
    const state = initialStatePerps().build();

    const network = state?.engine?.backgroundState?.NetworkController as
      | {
          providerConfig?: { chainId: string };
          selectedNetworkClientId?: string;
        }
      | undefined;
    expect(network?.providerConfig?.chainId).toBe('0x1');
    expect(network?.selectedNetworkClientId).toBe('mainnet');

    const prefs = state?.engine?.backgroundState?.PreferencesController as
      | {
          tokenSortConfig?: {
            key: string;
            order: string;
            sortCallback: string;
          };
        }
      | undefined;
    expect(prefs?.tokenSortConfig).toStrictEqual({
      key: 'tokenFiatAmount',
      order: 'dsc',
      sortCallback: 'stringNumeric',
    });
  });
});
