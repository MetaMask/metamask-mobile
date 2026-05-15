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

  it('returns undefined when not on empty homepage perps surface', () => {
    const { result } = renderHook(() =>
      useHomepagePerpsPillsEmptyTransactionActiveAbTests(false),
    );
    expect(result.current).toBeUndefined();
  });

  it('returns undefined when surface is empty but experiment assignment is inactive', () => {
    const { result } = renderHook(() =>
      useHomepagePerpsPillsEmptyTransactionActiveAbTests(true),
    );
    expect(result.current).toBeUndefined();
  });

  it('returns a normalized assignment when assignment is active and surface is empty', () => {
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
