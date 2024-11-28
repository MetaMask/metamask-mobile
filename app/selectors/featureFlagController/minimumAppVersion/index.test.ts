import { RootState } from '../../../reducers';
import mockedEngine from '../../../core/__mocks__/MockedEngine';
import { mockedState, mockedEmptyFlagsState } from '../mocks';
import {
  defaultValues,
  selectMobileMinimumVersions
} from '.';

jest.mock('../../../core/Engine', () => ({
  init: () => mockedEngine.init(),
}));

describe('Feature flag: minimumAppVersion', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return feature flag object', () => {
    const {
      appMinimumBuild,
      appleMinimumOS,
      androidMinimumAPIVersion,
    } = selectMobileMinimumVersions(mockedState as RootState);
    expect(appleMinimumOS).toBeDefined();
    expect(appMinimumBuild).toBeDefined();
    expect(androidMinimumAPIVersion).toBeDefined();
  });
  it('should return fallback values', () => {
    const {
      appMinimumBuild,
      appleMinimumOS,
      androidMinimumAPIVersion,
    } = selectMobileMinimumVersions(mockedEmptyFlagsState as RootState);
    expect(appMinimumBuild).toEqual(defaultValues.appMinimumBuild);
    expect(appleMinimumOS).toEqual(defaultValues.appleMinimumOS);
    expect(androidMinimumAPIVersion).toEqual(defaultValues.androidMinimumAPIVersion);
  });
});
