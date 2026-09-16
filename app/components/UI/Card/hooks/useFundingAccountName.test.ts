import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useAccountGroupName } from '../../../hooks/multichainAccounts/useAccountGroupName';
import { useFundingAccountName } from './useFundingAccountName';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../hooks/multichainAccounts/useAccountGroupName', () => ({
  useAccountGroupName: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseAccountGroupName = useAccountGroupName as jest.MockedFunction<
  typeof useAccountGroupName
>;

describe('useFundingAccountName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prefers the account group name', () => {
    mockUseAccountGroupName.mockReturnValue('Account 1');
    mockUseSelector.mockReturnValue({ metadata: { name: 'Fallback' } });

    const { result } = renderHook(() => useFundingAccountName());

    expect(result.current).toBe('Account 1');
  });

  it('falls back to account.metadata.name when the group name is unset', () => {
    mockUseAccountGroupName.mockReturnValue(null);
    mockUseSelector.mockReturnValue({ metadata: { name: 'Account 1' } });

    const { result } = renderHook(() => useFundingAccountName());

    expect(result.current).toBe('Account 1');
  });

  it('returns an empty string when neither name is available', () => {
    mockUseAccountGroupName.mockReturnValue(null);
    mockUseSelector.mockReturnValue(null);

    const { result } = renderHook(() => useFundingAccountName());

    expect(result.current).toBe('');
  });
});
