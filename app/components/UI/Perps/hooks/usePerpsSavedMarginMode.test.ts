import { renderHook, act } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import { usePerpsSavedMarginMode } from './usePerpsSavedMarginMode';
import { usePerpsSelector } from './usePerpsSelector';

jest.mock('./usePerpsSelector');
jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      saveMarginMode: jest.fn(),
    },
  },
}));

const mockUsePerpsSelector = usePerpsSelector as jest.MockedFunction<
  typeof usePerpsSelector
>;

describe('usePerpsSavedMarginMode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the saved margin mode for the market', () => {
    mockUsePerpsSelector.mockReturnValue('cross');

    const { result } = renderHook(() =>
      usePerpsSavedMarginMode('ETH', 'hyperliquid'),
    );

    expect(result.current.savedMarginMode).toBe('cross');
    expect(mockUsePerpsSelector).toHaveBeenCalled();
  });

  it('returns undefined when the market has no saved margin mode', () => {
    mockUsePerpsSelector.mockReturnValue(undefined);

    const { result } = renderHook(() => usePerpsSavedMarginMode('BTC'));

    expect(result.current.savedMarginMode).toBeUndefined();
  });

  it('persists the picked margin mode for the market and venue', () => {
    mockUsePerpsSelector.mockReturnValue(undefined);

    const { result } = renderHook(() =>
      usePerpsSavedMarginMode('ETH', 'hyperliquid'),
    );

    act(() => {
      result.current.saveMarginMode('cross');
    });

    expect(Engine.context.PerpsController?.saveMarginMode).toHaveBeenCalledWith(
      'ETH',
      'cross',
      'hyperliquid',
    );
  });
});
