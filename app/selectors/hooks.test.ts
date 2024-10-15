import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useChainId } from './hooks';
import { selectChainId } from '../selectors/networkController';

// Mock useSelector from react-redux
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

// Mock the selector
jest.mock('../selectors/networkController', () => ({
  selectChainId: jest.fn(),
}));

describe('useChainId hook', () => {
  afterEach(() => {
    jest.clearAllMocks(); // Clear mocks after each test to avoid test contamination
  });

  it('should return the chain ID from the redux store', () => {
    const mockChainId = 1;

    // Mock the selector to return the mockChainId
    (useSelector as jest.Mock).mockImplementation((selectorFn) => {
      if (selectorFn === selectChainId) {
        return mockChainId;
      }
    });

    const { result } = renderHook(() => useChainId());

    expect(result.current).toBe(mockChainId);
  });

  it('should return undefined if the chain ID is not set', () => {
    // Mock the selector to return undefined
    (useSelector as jest.Mock).mockImplementation((selectorFn) => {
      if (selectorFn === selectChainId) {
        return undefined;
      }
    });

    const { result } = renderHook(() => useChainId());

    expect(result.current).toBeUndefined();
  });
});
