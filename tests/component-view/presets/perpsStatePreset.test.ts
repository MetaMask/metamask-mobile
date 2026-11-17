import { DEFAULT_PRO_LAYOUT_PREFERENCES } from '@metamask/perps-controller';
import type { RootState } from '../../../app/reducers';
import { selectIsPerpsSocialEnabled } from '../../../app/components/UI/Perps/selectors/featureFlags';
import { initialStatePerps, initialStatePerpsPro } from './perpsStatePreset';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('8.17.0'),
}));

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

  it('builds Pro state with layout preferences', () => {
    const state = initialStatePerpsPro().build();

    const perps = state?.engine?.backgroundState?.PerpsController as
      | {
          mode?: string;
          proLayoutPreferences?: typeof DEFAULT_PRO_LAYOUT_PREFERENCES;
        }
      | undefined;
    expect(perps?.mode).toBe('pro');
    expect(perps?.proLayoutPreferences).toMatchObject(
      DEFAULT_PRO_LAYOUT_PREFERENCES,
    );
  });

  it('opens the Perps social gate when socialEnabled is true', () => {
    const state = initialStatePerps({ socialEnabled: true }).build();

    expect(selectIsPerpsSocialEnabled(state as RootState)).toBe(true);
  });

  it('closes the Perps social gate when socialEnabled is false', () => {
    const state = initialStatePerps({ socialEnabled: false }).build();

    expect(selectIsPerpsSocialEnabled(state as RootState)).toBe(false);
  });
});
