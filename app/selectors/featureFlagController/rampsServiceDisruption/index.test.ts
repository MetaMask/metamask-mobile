import { getVersion } from 'react-native-device-info';
import { selectRampsServiceDisruptionRegions } from '.';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '8.0.0'),
}));

const buildState = (rampsServiceDisruptionModal: unknown) =>
  ({
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          remoteFeatureFlags: { rampsServiceDisruptionModal },
          cacheTimestamp: 0,
        },
      },
    },
  }) as never;

describe('selectRampsServiceDisruptionRegions', () => {
  beforeEach(() => {
    (getVersion as jest.Mock).mockReturnValue('8.0.0');
  });

  it('returns the configured region codes (object shape, no version floor)', () => {
    expect(
      selectRampsServiceDisruptionRegions(
        buildState({ regions: ['in', 'us-ca'] }),
      ),
    ).toEqual(['in', 'us-ca']);
  });

  it('returns regions when the build meets minimumVersion', () => {
    (getVersion as jest.Mock).mockReturnValue('8.2.0');
    expect(
      selectRampsServiceDisruptionRegions(
        buildState({ regions: ['in'], minimumVersion: '8.1.0' }),
      ),
    ).toEqual(['in']);
  });

  it('returns [] when the build is older than minimumVersion', () => {
    (getVersion as jest.Mock).mockReturnValue('8.0.0');
    expect(
      selectRampsServiceDisruptionRegions(
        buildState({ regions: ['in'], minimumVersion: '9.0.0' }),
      ),
    ).toEqual([]);
  });

  it('accepts a bare array (no version gate) for back-compat', () => {
    expect(
      selectRampsServiceDisruptionRegions(buildState(['in', 'us-ca'])),
    ).toEqual(['in', 'us-ca']);
  });

  it('returns [] when the flag is missing', () => {
    expect(selectRampsServiceDisruptionRegions(buildState(undefined))).toEqual(
      [],
    );
  });

  it('returns [] when regions is empty', () => {
    expect(
      selectRampsServiceDisruptionRegions(buildState({ regions: [] })),
    ).toEqual([]);
  });

  it('filters out non-string region entries', () => {
    expect(
      selectRampsServiceDisruptionRegions(
        buildState({ regions: ['in', 5, null, 'fr'] }),
      ),
    ).toEqual(['in', 'fr']);
  });
});
