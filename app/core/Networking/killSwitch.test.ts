import ReduxService from '../redux';
import { isTierPolicyEnabled } from './killSwitch';

jest.mock('react-native-device-info', () => ({ getVersion: () => '8.22.0' }));
jest.mock('../redux', () => ({ store: { getState: jest.fn() } }));

const stateWith = (flag: unknown) =>
  ({
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          remoteFeatureFlags: { mobileNetworkingTierPolicies: flag },
        },
      },
    },
    settings: { basicFunctionalityEnabled: true },
  }) as unknown as ReturnType<typeof ReduxService.store.getState>;

describe('isTierPolicyEnabled', () => {
  it.each([
    [{ enabled: true, minimumVersion: '8.0.0' }, true],
    [{ enabled: false, minimumVersion: '8.0.0' }, false],
    [{ enabled: true, minimumVersion: '9.0.0' }, false],
    [{ enabled: true, minimumVersion: 'invalid' }, false],
    [undefined, false],
  ])('resolves remote flag %j to %s', (flag, expected) => {
    jest.mocked(ReduxService.store.getState).mockReturnValue(stateWith(flag));
    expect(isTierPolicyEnabled()).toBe(expected);
  });

  it('uses the build default before the store exists', () => {
    jest.mocked(ReduxService.store.getState).mockImplementation(() => {
      throw new Error('Redux store does not exist!');
    });
    expect(isTierPolicyEnabled()).toBe(false);
  });
});
