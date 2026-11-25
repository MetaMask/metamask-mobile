import ReduxService from '../redux';
import {
  resolveTierPolicyEnabled,
  selectTierPolicyEnabled,
} from '../../selectors/featureFlagController/networking';
import { isTierPolicyEnabled } from './killSwitch';

jest.mock('react-native-device-info', () => ({ getVersion: () => '8.22.0' }));
jest.mock('../redux', () => ({ storeIfInitialized: { getState: jest.fn() } }));
let mockOverride = false;

jest.mock('../Engine/controllers/remote-feature-flag-controller', () => ({
  get isRemoteFeatureFlagOverrideActivated() {
    return mockOverride;
  },
}));

describe('networking kill switch', () => {
  afterEach(() => {
    mockOverride = false;
  });

  it.each([
    {
      flag: { enabled: true, minimumVersion: '8.0.0' },
      local: false,
      expected: true,
    },
    {
      flag: { enabled: false, minimumVersion: '8.0.0' },
      local: true,
      expected: false,
    },
    {
      flag: { enabled: false, minimumVersion: '9.0.0' },
      local: true,
      expected: true,
    },
    {
      flag: { enabled: true, minimumVersion: 'invalid' },
      local: false,
      expected: false,
    },
    { flag: { enabled: 'true' }, local: true, expected: true },
    { flag: undefined, local: false, expected: false },
    {
      flag: { enabled: true, minimumVersion: '8.0.0' },
      local: false,
      expected: false,
      override: true,
    },
  ])(
    'resolves the remote flag and build fallback: %j',
    ({ flag, local, expected, override }) => {
      mockOverride = override === true;
      expect(resolveTierPolicyEnabled(flag, local)).toBe(expected);
    },
  );

  it.each([true, false])(
    'shares remote %s between selector and getter',
    (enabled) => {
      const flag = { enabled, minimumVersion: '8.0.0' };
      const state = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: { mobileNetworkingTierPolicies: flag },
            },
          },
        },
        settings: { basicFunctionalityEnabled: true },
      } as unknown as ReturnType<
        NonNullable<typeof ReduxService.storeIfInitialized>['getState']
      >;
      const store = ReduxService.storeIfInitialized;
      if (!store) throw new Error('Missing test store');
      jest.mocked(store.getState).mockReturnValue(state);
      expect(selectTierPolicyEnabled(state)).toBe(enabled);
      expect(isTierPolicyEnabled()).toBe(enabled);
    },
  );
});
