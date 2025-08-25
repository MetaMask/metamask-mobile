import {
  selectPerpsEnabledFlag,
  selectPerpsServiceInterruptionBannerEnabledFlag,
} from '.';
import mockedEngine from '../../../../../core/__mocks__/MockedEngine';
import { mockedState } from '../../../../../selectors/featureFlagController/mocks';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

jest.mock('../../../../../core/Engine', () => ({
  init: () => mockedEngine.init(),
}));

describe('Perps Feature Flag Selectors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('selectPerpsEnabledFlag', () => {
    it('returns boolean feature flag', () => {
      const result = selectPerpsEnabledFlag(mockedState);
      expect(result).toBe(true);
    });
  });

  describe('selectPerpsServiceInterruptionBannerEnabledFlag', () => {
    it('returns boolean feature flag', () => {
      const result =
        selectPerpsServiceInterruptionBannerEnabledFlag(mockedState);
      expect(result).toBe(true);
    });
  });
});
