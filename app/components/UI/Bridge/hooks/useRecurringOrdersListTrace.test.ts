import { renderHook } from '@testing-library/react-native';
import { TraceName } from '../../../../util/trace';
import {
  cancelRecurringOrderTrace,
  finishRecurringOrderTrace,
  startRecurringOrdersListTrace,
} from '../utils/recurringOrderTrace';
import { useRecurringOrdersListTrace } from './useRecurringOrdersListTrace';

jest.mock('../utils/recurringOrderTrace', () => ({
  cancelRecurringOrderTrace: jest.fn(),
  finishRecurringOrderTrace: jest.fn(),
  startRecurringOrdersListTrace: jest.fn(),
}));

const loadingProps = {
  enabled: true,
  listType: 'open' as const,
  hasNetworkFilter: false,
  isLoading: true,
  isError: false,
  resultCount: 0,
};

describe('useRecurringOrdersListTrace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(startRecurringOrdersListTrace).mockReturnValue({
      id: 'list-trace-id',
      name: TraceName.RecurringOrdersListReady,
    });
  });

  it('finishes with success when the first page has orders', () => {
    const { rerender } = renderHook(
      (props: typeof loadingProps) => useRecurringOrdersListTrace(props),
      { initialProps: loadingProps },
    );

    rerender({
      ...loadingProps,
      isLoading: false,
      resultCount: 2,
    });

    expect(startRecurringOrdersListTrace).toHaveBeenCalledWith({
      listType: 'open',
      hasNetworkFilter: false,
    });
    expect(finishRecurringOrderTrace).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'list-trace-id' }),
      { result: 'success', resultCount: 2 },
    );
  });

  it('finishes with empty when the first page has no orders', () => {
    const { rerender } = renderHook(
      (props: typeof loadingProps) => useRecurringOrdersListTrace(props),
      { initialProps: loadingProps },
    );

    rerender({
      ...loadingProps,
      isLoading: false,
    });

    expect(finishRecurringOrderTrace).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'list-trace-id' }),
      { result: 'empty', resultCount: 0 },
    );
  });

  it('finishes with error when the first page fails', () => {
    const { rerender } = renderHook(
      (props: typeof loadingProps) => useRecurringOrdersListTrace(props),
      { initialProps: loadingProps },
    );

    rerender({
      ...loadingProps,
      isLoading: false,
      isError: true,
    });

    expect(finishRecurringOrderTrace).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'list-trace-id' }),
      { result: 'error' },
    );
  });

  it('cancels an unfinished trace on unmount', () => {
    const { unmount } = renderHook(() =>
      useRecurringOrdersListTrace(loadingProps),
    );

    unmount();

    expect(cancelRecurringOrderTrace).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'list-trace-id' }),
    );
    expect(finishRecurringOrderTrace).not.toHaveBeenCalled();
  });
});
