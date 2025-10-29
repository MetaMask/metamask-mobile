import { renderHook } from '@testing-library/react-native';
import { useFeatureFlagStats } from './useFeatureFlagStats';
import {
  FeatureFlagOverrideContextType,
  useFeatureFlagOverride,
} from '../contexts/FeatureFlagOverrideContext';
import { FeatureFlagInfo } from '../util/feature-flags';

jest.mock('../contexts/FeatureFlagOverrideContext', () => ({
  useFeatureFlagOverride: jest.fn(),
}));

describe('useFeatureFlagStats', () => {
  let mockUseFeatureFlagOverride: jest.MockedFunction<
    typeof useFeatureFlagOverride
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFeatureFlagOverride = jest.mocked(useFeatureFlagOverride);
  });

  const createMockFeatureFlag = (
    key: string,
    type: FeatureFlagInfo['type'],
    value: unknown = true,
    isOverridden: boolean = false,
  ): FeatureFlagInfo => ({
    key,
    value,
    originalValue: value,
    type,
    description: `Description for ${key}`,
    isOverridden,
  });

  it('returns correct stats for empty feature flags list', () => {
    mockUseFeatureFlagOverride.mockReturnValue({
      featureFlagsList: [],
    } as unknown as FeatureFlagOverrideContextType);

    const { result } = renderHook(() => useFeatureFlagStats());

    expect(result.current).toEqual({
      total: 0,
      boolean: 0,
      object: 0,
      string: 0,
      number: 0,
      array: 0,
    });
  });

  it('returns correct stats for single boolean flag', () => {
    const mockFlags: FeatureFlagInfo[] = [
      createMockFeatureFlag('testFlag', 'boolean', true),
    ];

    mockUseFeatureFlagOverride.mockReturnValue({
      featureFlagsList: mockFlags,
    } as FeatureFlagOverrideContextType);

    const { result } = renderHook(() => useFeatureFlagStats());

    expect(result.current).toEqual({
      total: 1,
      boolean: 1,
      object: 0,
      string: 0,
      number: 0,
      array: 0,
    });
  });

  it('returns correct stats for single string flag', () => {
    const mockFlags: FeatureFlagInfo[] = [
      createMockFeatureFlag('testFlag', 'string', 'test value'),
    ];

    mockUseFeatureFlagOverride.mockReturnValue({
      featureFlagsList: mockFlags,
    } as FeatureFlagOverrideContextType);

    const { result } = renderHook(() => useFeatureFlagStats());

    expect(result.current).toEqual({
      total: 1,
      boolean: 0,
      object: 0,
      string: 1,
      number: 0,
      array: 0,
    });
  });

  it('returns correct stats for single number flag', () => {
    const mockFlags: FeatureFlagInfo[] = [
      createMockFeatureFlag('testFlag', 'number', 42),
    ];

    mockUseFeatureFlagOverride.mockReturnValue({
      featureFlagsList: mockFlags,
    } as FeatureFlagOverrideContextType);

    const { result } = renderHook(() => useFeatureFlagStats());

    expect(result.current).toEqual({
      total: 1,
      boolean: 0,
      object: 0,
      string: 0,
      number: 1,
      array: 0,
    });
  });

  it('returns correct stats for single array flag', () => {
    const mockFlags: FeatureFlagInfo[] = [
      createMockFeatureFlag('testFlag', 'array', ['item1', 'item2']),
    ];

    mockUseFeatureFlagOverride.mockReturnValue({
      featureFlagsList: mockFlags,
    } as FeatureFlagOverrideContextType);

    const { result } = renderHook(() => useFeatureFlagStats());

    expect(result.current).toEqual({
      total: 1,
      boolean: 0,
      object: 0,
      string: 0,
      number: 0,
      array: 1,
    });
  });

  it('returns correct stats for single object flag', () => {
    const mockFlags: FeatureFlagInfo[] = [
      createMockFeatureFlag('testFlag', 'object', { key: 'value' }),
    ];

    mockUseFeatureFlagOverride.mockReturnValue({
      featureFlagsList: mockFlags,
    } as FeatureFlagOverrideContextType);

    const { result } = renderHook(() => useFeatureFlagStats());

    expect(result.current).toEqual({
      total: 1,
      boolean: 0,
      object: 1,
      string: 0,
      number: 0,
      array: 0,
    });
  });

  it('counts "boolean with minimumVersion" as boolean type', () => {
    const mockFlags: FeatureFlagInfo[] = [
      createMockFeatureFlag('testFlag', 'boolean with minimumVersion', {
        enabled: true,
        minimumVersion: '1.0.0',
      }),
    ];

    mockUseFeatureFlagOverride.mockReturnValue({
      featureFlagsList: mockFlags,
    } as FeatureFlagOverrideContextType);

    const { result } = renderHook(() => useFeatureFlagStats());

    expect(result.current).toEqual({
      total: 1,
      boolean: 1,
      object: 0,
      string: 0,
      number: 0,
      array: 0,
    });
  });

  it('counts "boolean nested" type as boolean type', () => {
    const mockFlags: FeatureFlagInfo[] = [
      createMockFeatureFlag('testFlag', 'boolean nested', {
        value: true,
        otherProp: 'test',
      }),
    ];

    mockUseFeatureFlagOverride.mockReturnValue({
      featureFlagsList: mockFlags,
    } as FeatureFlagOverrideContextType);

    const { result } = renderHook(() => useFeatureFlagStats());

    expect(result.current).toEqual({
      total: 1,
      boolean: 1, // "boolean nested" is properly counted as boolean
      object: 0,
      string: 0,
      number: 0,
      array: 0,
    });
  });

  it('returns correct stats for mixed feature flag types with known types only', () => {
    const mockFlags: FeatureFlagInfo[] = [
      createMockFeatureFlag('booleanFlag', 'boolean', true),
      createMockFeatureFlag('stringFlag', 'string', 'test'),
      createMockFeatureFlag('numberFlag', 'number', 42),
      createMockFeatureFlag('arrayFlag', 'array', ['item']),
      createMockFeatureFlag('objectFlag', 'object', { key: 'value' }),
      createMockFeatureFlag('versionFlag', 'boolean with minimumVersion', {
        enabled: true,
        minimumVersion: '1.0.0',
      }),
    ];

    mockUseFeatureFlagOverride.mockReturnValue({
      featureFlagsList: mockFlags,
    } as FeatureFlagOverrideContextType);

    const { result } = renderHook(() => useFeatureFlagStats());

    expect(result.current).toEqual({
      total: 6,
      boolean: 2, // regular boolean + boolean with minimumVersion
      object: 1,
      string: 1,
      number: 1,
      array: 1,
    });
  });

  it('returns correct stats for multiple flags of same type', () => {
    const mockFlags: FeatureFlagInfo[] = [
      createMockFeatureFlag('booleanFlag1', 'boolean', true),
      createMockFeatureFlag('booleanFlag2', 'boolean', false),
      createMockFeatureFlag('stringFlag1', 'string', 'test1'),
      createMockFeatureFlag('stringFlag2', 'string', 'test2'),
      createMockFeatureFlag('stringFlag3', 'string', ''),
    ];

    mockUseFeatureFlagOverride.mockReturnValue({
      featureFlagsList: mockFlags,
    } as FeatureFlagOverrideContextType);

    const { result } = renderHook(() => useFeatureFlagStats());

    expect(result.current).toEqual({
      total: 5,
      boolean: 2,
      object: 0,
      string: 3,
      number: 0,
      array: 0,
    });
  });

  it('handles large number of feature flags correctly', () => {
    const mockFlags: FeatureFlagInfo[] = Array.from(
      { length: 100 },
      (_, index) => createMockFeatureFlag(`flag${index}`, 'boolean', true),
    );

    mockUseFeatureFlagOverride.mockReturnValue({
      featureFlagsList: mockFlags,
    } as FeatureFlagOverrideContextType);

    const { result } = renderHook(() => useFeatureFlagStats());

    expect(result.current).toEqual({
      total: 100,
      boolean: 100,
      object: 0,
      string: 0,
      number: 0,
      array: 0,
    });
  });

  it('memoizes result and does not recalculate when featureFlagsList reference is same', () => {
    const mockFlags: FeatureFlagInfo[] = [
      createMockFeatureFlag('testFlag', 'boolean', true),
    ];

    mockUseFeatureFlagOverride.mockReturnValue({
      featureFlagsList: mockFlags,
    } as FeatureFlagOverrideContextType);

    const { result, rerender } = renderHook(() => useFeatureFlagStats());

    const firstResult = result.current;

    rerender(null);

    const secondResult = result.current;

    expect(firstResult).toBe(secondResult); // Same reference due to memoization
  });

  it('recalculates when featureFlagsList changes', () => {
    const initialFlags: FeatureFlagInfo[] = [
      createMockFeatureFlag('testFlag', 'boolean', true),
    ];

    mockUseFeatureFlagOverride.mockReturnValue({
      featureFlagsList: initialFlags,
    } as FeatureFlagOverrideContextType);

    const { result, rerender } = renderHook(() => useFeatureFlagStats());

    expect(result.current.total).toBe(1);
    expect(result.current.boolean).toBe(1);

    // Change the feature flags list
    const newFlags: FeatureFlagInfo[] = [
      createMockFeatureFlag('testFlag1', 'boolean', true),
      createMockFeatureFlag('testFlag2', 'string', 'test'),
    ];

    mockUseFeatureFlagOverride.mockReturnValue({
      featureFlagsList: newFlags,
    } as FeatureFlagOverrideContextType);

    rerender(null);

    expect(result.current.total).toBe(2);
    expect(result.current.boolean).toBe(1);
    expect(result.current.string).toBe(1);
  });

  it('handles flags with isOverridden property correctly', () => {
    const mockFlags: FeatureFlagInfo[] = [
      createMockFeatureFlag('overriddenFlag', 'boolean', true, true),
      createMockFeatureFlag('normalFlag', 'string', 'test', false),
    ];

    mockUseFeatureFlagOverride.mockReturnValue({
      featureFlagsList: mockFlags,
    } as FeatureFlagOverrideContextType);

    const { result } = renderHook(() => useFeatureFlagStats());

    expect(result.current).toEqual({
      total: 2,
      boolean: 1,
      object: 0,
      string: 1,
      number: 0,
      array: 0,
    });
  });

  it('handles flags with different value types but same flag type', () => {
    const mockFlags: FeatureFlagInfo[] = [
      createMockFeatureFlag('stringFlag1', 'string', 'hello'),
      createMockFeatureFlag('stringFlag2', 'string', ''),
      createMockFeatureFlag('stringFlag3', 'string', '123'),
      createMockFeatureFlag('numberFlag1', 'number', 0),
      createMockFeatureFlag('numberFlag2', 'number', -5),
      createMockFeatureFlag('numberFlag3', 'number', 3.14),
    ];

    mockUseFeatureFlagOverride.mockReturnValue({
      featureFlagsList: mockFlags,
    } as FeatureFlagOverrideContextType);

    const { result } = renderHook(() => useFeatureFlagStats());

    expect(result.current).toEqual({
      total: 6,
      boolean: 0,
      object: 0,
      string: 3,
      number: 3,
      array: 0,
    });
  });

  it('handles complex objects and arrays correctly', () => {
    const mockFlags: FeatureFlagInfo[] = [
      createMockFeatureFlag('complexObject', 'object', {
        nested: { deep: 'value' },
        array: [1, 2, 3],
        boolean: true,
      }),
      createMockFeatureFlag('complexArray', 'array', [
        { id: 1, name: 'item1' },
        { id: 2, name: 'item2' },
      ]),
      createMockFeatureFlag('emptyArray', 'array', []),
      createMockFeatureFlag('emptyObject', 'object', {}),
    ];

    mockUseFeatureFlagOverride.mockReturnValue({
      featureFlagsList: mockFlags,
    } as FeatureFlagOverrideContextType);

    const { result } = renderHook(() => useFeatureFlagStats());

    expect(result.current).toEqual({
      total: 4,
      boolean: 0,
      object: 2,
      string: 0,
      number: 0,
      array: 2,
    });
  });
});
