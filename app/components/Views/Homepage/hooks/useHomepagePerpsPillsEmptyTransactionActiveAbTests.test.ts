import { renderHook } from '@testing-library/react-native';

import { HOMEPAGE_PERPS_PILLS_EMPTY_AB_KEY } from '../abTestConfig';
import { useHomepagePerpsPillsEmptyTransactionActiveAbTests } from './useHomepagePerpsPillsEmptyTransactionActiveAbTests';
import { createActiveABTestAssignment } from '../../../../util/analytics/activeABTestAssignments';

const mockUseABTest = jest.fn();

jest.mock('../../../../hooks', () => ({
  useABTest: (...args: unknown[]) => mockUseABTest(...args),
}));

describe('useHomepagePerpsPillsEmptyTransactionActiveAbTests', () => {
  beforeEach(() => {
    mockUseABTest.mockReturnValue({
      isActive: false,
      variantName: 'control',
    });
  });

  it('returns undefined when pills empty state is not shown', () => {
    const { result } = renderHook(() =>
      useHomepagePerpsPillsEmptyTransactionActiveAbTests(false),
    );
    expect(result.current).toBeUndefined();
  });

  it('returns undefined when pills empty state is shown but experiment assignment is inactive', () => {
    const { result } = renderHook(() =>
      useHomepagePerpsPillsEmptyTransactionActiveAbTests(true),
    );
    expect(result.current).toBeUndefined();
  });

  it('returns a normalized assignment when assignment is active and pills empty state is shown', () => {
    mockUseABTest.mockReturnValue({
      isActive: true,
      variantName: 'treatment',
    });

    const { result } = renderHook(() =>
      useHomepagePerpsPillsEmptyTransactionActiveAbTests(true),
    );

    expect(result.current).toEqual([
      createActiveABTestAssignment(
        HOMEPAGE_PERPS_PILLS_EMPTY_AB_KEY,
        'treatment',
      ),
    ]);
  });
});
