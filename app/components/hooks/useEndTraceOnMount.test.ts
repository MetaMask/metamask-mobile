import { renderHook } from '@testing-library/react-hooks';
import { useEndTraceOnMount } from './useEndTraceOnMount';
import { endTrace, TraceName } from '../../util/trace';

jest.mock('../../util/trace', () => ({
  endTrace: jest.fn(),
  TraceName: {
    DeveloperTest: 'DeveloperTest',
  },
}));

describe('useEndTraceOnMount', () => {
  const mockEndTrace = endTrace as jest.MockedFunction<typeof endTrace>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call endTrace with the provided trace name on mount', () => {
    renderHook(() => useEndTraceOnMount(TraceName.DeveloperTest));
    expect(mockEndTrace).toHaveBeenCalledTimes(1);

    expect(mockEndTrace).toHaveBeenCalledWith({
      name: TraceName.DeveloperTest,
    });
  });

  it('should only call endTrace once even on re-renders', () => {
    const { rerender } = renderHook(() =>
      useEndTraceOnMount(TraceName.DeveloperTest),
    );

    expect(mockEndTrace).toHaveBeenCalledTimes(1);

    rerender();

    expect(mockEndTrace).toHaveBeenCalledTimes(1);
  });
});
