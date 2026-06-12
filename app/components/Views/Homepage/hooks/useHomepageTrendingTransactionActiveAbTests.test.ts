import { renderHook } from '@testing-library/react-native';

import { HOMEPAGE_TRENDING_SECTIONS_AB_KEY } from '../abTestConfig';
import { useHomepageTrendingTransactionActiveAbTests } from './useHomepageTrendingTransactionActiveAbTests';
import { createActiveABTestAssignment } from '../../../../util/analytics/activeABTestAssignments';

const mockTrendingAbTest = jest.fn(() => ({
  isActive: false,
  variantName: 'control',
}));

jest.mock('../context/HomepageTrendingAbTestContext', () => ({
  useHomepageTrendingAbTest: () => mockTrendingAbTest(),
}));

describe('useHomepageTrendingTransactionActiveAbTests', () => {
  beforeEach(() => {
    mockTrendingAbTest.mockReturnValue({
      isActive: false,
      variantName: 'control',
    });
  });

  it('returns undefined when experiment assignment is not active', () => {
    const { result } = renderHook(() =>
      useHomepageTrendingTransactionActiveAbTests(),
    );
    expect(result.current).toBeUndefined();
  });

  it('returns a normalized assignment when assignment is active', () => {
    mockTrendingAbTest.mockReturnValue({
      isActive: true,
      variantName: 'trendingSections',
    });

    const { result } = renderHook(() =>
      useHomepageTrendingTransactionActiveAbTests(),
    );

    expect(result.current).toEqual([
      createActiveABTestAssignment(
        HOMEPAGE_TRENDING_SECTIONS_AB_KEY,
        'trendingSections',
      ),
    ]);
  });
});
