import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useABTest } from './useABTest';
import { useSocialV1Exposure } from './useSocialV1Exposure';
import {
  SOCIAL_V1_AB_KEY,
  SOCIAL_V1_EXPOSURE_METADATA,
  SOCIAL_V1_VARIANTS,
} from '../constants/socialV1';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));
jest.mock('./useABTest', () => ({
  useABTest: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseABTest = jest.mocked(useABTest);

describe('useSocialV1Exposure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    [false, true],
    [true, false],
  ])(
    'with early access %s, sets trackExposure to %s',
    (hasEarlyAccess, trackExposure) => {
      mockUseSelector.mockReturnValue(hasEarlyAccess);

      renderHook(() => useSocialV1Exposure());

      expect(mockUseABTest).toHaveBeenCalledWith(
        SOCIAL_V1_AB_KEY,
        SOCIAL_V1_VARIANTS,
        { ...SOCIAL_V1_EXPOSURE_METADATA, trackExposure },
      );
    },
  );
});
