import { RootState } from '../../../reducers';
import mockedEngine from '../../../core/__mocks__/MockedEngine';
import { mockedState, mockedEmptyFlagsState } from '../mocks';
import {
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
    expect(appMinimumBuild).toBe(1024);
    expect(appleMinimumOS).toBe(1025);
    expect(androidMinimumAPIVersion).toBe(1026);
  });
});
