import { renderHook } from '@testing-library/react-hooks';
import useConfirmationAlerts from './useConfirmationAlerts';

describe('useConfirmationAlerts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty array if no alerts', () => {
    const { result } = renderHook(() => useConfirmationAlerts());
    expect(result.current).toEqual([]);
  });
});
