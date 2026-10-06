import { renderHook } from '@testing-library/react-native';
import { useIsFocused } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { selectIsUnlocked } from '../../../../selectors/keyringController';
import {
  TRADER_POSITION_POLL_INTERVAL_MS,
  useTraderPosition,
} from './useTraderPosition';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useIsFocused: jest.fn(),
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('../../../../util/social/socialServiceTelemetry', () => ({
  formatSocialQueryErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : null,
  useLogSocialQueryError: jest.fn(),
}));

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseIsFocused = useIsFocused as jest.MockedFunction<
  typeof useIsFocused
>;

describe('useTraderPosition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIsFocused.mockReturnValue(true);
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectIsUnlocked) return true;
      return undefined;
    });
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useQuery>);
  });

  it('polls while the screen is focused', () => {
    renderHook(() => useTraderPosition('pos-1'));

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        refetchInterval: TRADER_POSITION_POLL_INTERVAL_MS,
      }),
    );
  });

  it('stops polling when the screen is not focused', () => {
    mockUseIsFocused.mockReturnValue(false);

    renderHook(() => useTraderPosition('pos-1'));

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ refetchInterval: false }),
    );
  });

  it('stays idle when there is no position id', () => {
    const { result } = renderHook(() => useTraderPosition(undefined));

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
    expect(result.current.position).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});
