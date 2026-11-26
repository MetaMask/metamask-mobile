import { act, renderHook } from '@testing-library/react-native';
import StorageWrapper from '../../../../store/storage-wrapper';
import { VBA_DETAILS_NEW_DOT_SEEN } from '../../../../constants/storage';
import { useVbaDetailsNewDot } from './useVbaDetailsNewDot';

jest.mock('../../../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItemSync: jest.fn(),
    setItem: jest.fn(),
  },
}));

const mockGetItemSync = jest.mocked(StorageWrapper.getItemSync);
const mockSetItem = jest.mocked(StorageWrapper.setItem);

describe('useVbaDetailsNewDot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItemSync.mockReturnValue(null);
    mockSetItem.mockResolvedValue(undefined);
  });

  it('shows the dot when the flag has not been seen', () => {
    const { result } = renderHook(() => useVbaDetailsNewDot());

    expect(result.current.showNewDot).toBe(true);
  });

  it('hides the dot without waiting for storage when the flag is persisted', () => {
    mockGetItemSync.mockReturnValue('true');

    const { result } = renderHook(() => useVbaDetailsNewDot());

    expect(result.current.showNewDot).toBe(false);
  });

  it('persists the seen flag and hides the dot', () => {
    const { result } = renderHook(() => useVbaDetailsNewDot());

    act(() => result.current.markSeen());

    expect(result.current.showNewDot).toBe(false);
    expect(mockSetItem).toHaveBeenCalledWith(VBA_DETAILS_NEW_DOT_SEEN, 'true');
  });

  it('does not rewrite the flag once it is already persisted', () => {
    mockGetItemSync.mockReturnValue('true');
    const { result } = renderHook(() => useVbaDetailsNewDot());

    act(() => result.current.markSeen());

    expect(result.current.showNewDot).toBe(false);
    expect(mockSetItem).not.toHaveBeenCalled();
  });
});
