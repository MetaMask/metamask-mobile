import { renderHook } from '@testing-library/react-hooks';
import { useAccountMenuEnabled } from './useAccountMenuEnabled';
import { selectAccountMenuEnabled } from '.';

jest.mock('.', () => ({
  selectAccountMenuEnabled: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector) => selector()),
}));

describe('useAccountMenuEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when account menu is enabled', () => {
    jest.mocked(selectAccountMenuEnabled).mockReturnValue(true);

    const { result } = renderHook(() => useAccountMenuEnabled());

    expect(result.current).toBe(true);
  });

  it('returns false when account menu is disabled', () => {
    jest.mocked(selectAccountMenuEnabled).mockReturnValue(false);

    const { result } = renderHook(() => useAccountMenuEnabled());

    expect(result.current).toBe(false);
  });
});
