import mockedEngine from '../../../core/__mocks__/MockedEngine';
import { mockedEmptyFlagsState, mockedState, mockedUndefinedFlagsState } from '../mocks';
import { mockedMinimumAppVersion, defaultValues } from './constants';
import { MinimumAppVersionType } from './types';
import {
  selectAndroidMinimumAPI,
  selectAppMinimumBuild,
  selectAppleMinimumOS,
  selectMobileMinimumVersions
} from '.';

jest.mock('../../../core/Engine', () => ({
  init: () => mockedEngine.init(),
}));


describe('minimumAppVersion Feature flag: selectMobileMinimumVersions selector', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const testFlagValues = (result: unknown, expected: MinimumAppVersionType) => {
    const {
      appMinimumBuild,
      appleMinimumOS,
      androidMinimumAPIVersion,
    } = result as MinimumAppVersionType;

    const {
      appMinimumBuild: mockedAppMinimumBuild,
      appleMinimumOS: mockedAppleMinimumOS,
      androidMinimumAPIVersion: mockedAndroidMinimumAPIVersion,
    } = expected;

    expect(appMinimumBuild).toEqual(mockedAppMinimumBuild);
    expect(appleMinimumOS).toEqual(mockedAppleMinimumOS);
    expect(androidMinimumAPIVersion).toEqual(mockedAndroidMinimumAPIVersion);
  };
  it('returns default values when empty feature flag state', () => {
    testFlagValues(
      selectMobileMinimumVersions(mockedEmptyFlagsState),
      defaultValues);
  });

  it('returns default values when undefined RemoteFeatureFlagController state', () => {
    testFlagValues(
      selectMobileMinimumVersions(mockedUndefinedFlagsState),
        defaultValues
    );
  });

  it('returns remote values', () => {
    testFlagValues(
      selectMobileMinimumVersions(mockedState),
      mockedMinimumAppVersion.mobileMinimumVersions
    );
  });

});

describe('minimumAppVersion Feature flag: appMinimumBuild selector', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns default value when empty feature flag state', () => {
    expect(
      selectAppMinimumBuild(mockedEmptyFlagsState)
    ).toEqual(defaultValues.appMinimumBuild);
  });

  it('returns default value when undefined RemoteFeatureFlagController state', () => {
    expect(
      selectAppMinimumBuild(mockedUndefinedFlagsState)
    ).toEqual(defaultValues.appMinimumBuild);
  });

  it('returns default value when empty feature flag state', () => {
    const { appMinimumBuild: mockedValue } =
      mockedMinimumAppVersion.mobileMinimumVersions;

    expect(
      selectAppMinimumBuild(mockedState)
    ).toEqual(mockedValue);
  });
});

describe('minimumAppVersion Feature flag: appleMinimumOS selector', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns default value when empty feature flag state', () => {
    const { appleMinimumOS: mockedValue } = defaultValues;
    expect(
      selectAppleMinimumOS(mockedEmptyFlagsState)
    ).toEqual(mockedValue);
  });

  it('returns default value when undefined RemoteFeatureFlagController state', () => {
    const { appleMinimumOS: mockedValue } = defaultValues;
    expect(
      selectAppleMinimumOS(mockedUndefinedFlagsState)
    ).toEqual(mockedValue);
  });

  it('returns default value when empty feature flag state', () => {
    const { appleMinimumOS: mockedValue } =
      mockedMinimumAppVersion.mobileMinimumVersions;

    expect(
      selectAppleMinimumOS(mockedState)
    ).toEqual(mockedValue);
  });
});

describe('minimumAppVersion Feature flag: androidMinimumAPIVersion selector', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns default value when empty feature flag state', () => {
    const { androidMinimumAPIVersion: mockedValue } = defaultValues;
    expect(
      selectAndroidMinimumAPI(mockedEmptyFlagsState)
    ).toEqual(mockedValue);
  });

  it('returns default value when undefined RemoteFeatureFlagController state', () => {
    const { androidMinimumAPIVersion: mockedValue } = defaultValues;
    expect(
      selectAndroidMinimumAPI(mockedUndefinedFlagsState)
    ).toEqual(mockedValue);
  });

  it('returns default value when empty feature flag state', () => {
    const { androidMinimumAPIVersion: mockedValue } =
      mockedMinimumAppVersion.mobileMinimumVersions;

    expect(
      selectAndroidMinimumAPI(mockedState)
    ).toEqual(mockedValue);
  });
});
