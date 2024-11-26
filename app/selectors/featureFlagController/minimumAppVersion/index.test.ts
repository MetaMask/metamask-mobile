import { RootState } from '../../../reducers';
import mockedEngine from '../../../core/__mocks__/MockedEngine';
import { mockedState } from '../mocks';
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
    const result = selectMobileMinimumVersions(mockedState as RootState);
    expect(result?.appleMinimumOS).toBeDefined();
    expect(result?.appMinimumBuild).toBeDefined();
    expect(result?.androidMinimumAPIVersion).toBeDefined();
  });
});
