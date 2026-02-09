import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useAccountGroupName } from './useAccountGroupName';
import { selectSelectedAccountGroup } from '../../../selectors/multichainAccounts/accountTreeController';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

describe('useAccountGroupName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the account group name when account group is selected', () => {
    const mockUseSelector = useSelector as jest.Mock;
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSelectedAccountGroup) {
        return {
          metadata: { name: 'My Account Group' },
        };
      }
      return undefined;
    });

    const { result } = renderHook(() => useAccountGroupName());

    expect(result.current).toBe('My Account Group');
  });

  it('returns null when no account group is selected', () => {
    const mockUseSelector = useSelector as jest.Mock;
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSelectedAccountGroup) {
        return null;
      }
      return undefined;
    });

    const { result } = renderHook(() => useAccountGroupName());

    expect(result.current).toBeNull();
  });
});
