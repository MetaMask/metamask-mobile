import { RootState } from '../../reducers';
import mockedEngine from '../../core/__mocks__/MockedEngine';
import { selectRemoteFeatureFlagControllerState } from '.';
import { mockedState } from './mocks'

jest.mock('../../core/Engine', () => ({
  init: () => mockedEngine.init(),
}));

describe('featureFlagController', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });


  it('should return feature flag initial state', () => {
    const result = selectRemoteFeatureFlagControllerState(mockedState as RootState);
    expect(result).toBeDefined();
  });
});

