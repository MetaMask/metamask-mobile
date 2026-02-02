import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useAccountGroupName } from './useAccountGroupName';
import { selectMultichainAccountsState2Enabled } from '../../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts';
import { selectSelectedAccountGroup } from '../../../selectors/multichainAccounts/accountTreeController';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

describe('useAccountGroupName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the account group name when multichain accounts state 2 is enabled', () => {
    const mockUseSelector = useSelector as jest.Mock;
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectMultichainAccountsState2Enabled) {
        return true;
      }
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

  it('returns null when multichain accounts state 2 is disabled', () => {
    const mockUseSelector = useSelector as jest.Mock;
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectMultichainAccountsState2Enabled) {
        return false;
      }
      if (selector === selectSelectedAccountGroup) {
        return {
          metadata: { name: 'My Account Group' },
        };
      }
      return undefined;
    });

    const { result } = renderHook(() => useAccountGroupName());
    expect(result.current).toBeNull();
  });
});
