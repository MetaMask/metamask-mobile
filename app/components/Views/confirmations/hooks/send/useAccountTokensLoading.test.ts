import { renderHook } from '@testing-library/react-hooks';
import type { AccountGroupId } from '@metamask/account-api';
import { isAccountGroupAssetLoadPending } from '../../../../../core/Assets/accountGroupAssetLoader';
import { useAccountOverrideGroupId } from './useAccountOverrideGroupId';
import { useAccountTokensLoading } from './useAccountTokensLoading';

jest.mock('../../../../../core/Assets/accountGroupAssetLoader', () => ({
  isAccountGroupAssetLoadPending: jest.fn(),
  subscribeToAccountGroupAssetLoads: jest.fn(() => () => undefined),
}));

jest.mock('./useAccountOverrideGroupId', () => ({
  useAccountOverrideGroupId: jest.fn(),
}));

const mockIsPending = jest.mocked(isAccountGroupAssetLoadPending);
const mockUseAccountOverrideGroupId = jest.mocked(useAccountOverrideGroupId);

const GROUP_ID = 'entropy:wallet-1/2' as AccountGroupId;

describe('useAccountTokensLoading', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAccountOverrideGroupId.mockReturnValue(GROUP_ID);
  });

  it('reports loading while the override group fetch is in flight', () => {
    mockIsPending.mockReturnValue(true);

    const { result } = renderHook(() => useAccountTokensLoading());

    expect(result.current).toBe(true);
    expect(mockIsPending).toHaveBeenCalledWith(GROUP_ID);
  });

  it('reports not loading once the fetch settles', () => {
    mockIsPending.mockReturnValue(false);

    const { result } = renderHook(() => useAccountTokensLoading());

    expect(result.current).toBe(false);
  });

  it('checks the undefined group when no override is active', () => {
    mockUseAccountOverrideGroupId.mockReturnValue(undefined);
    mockIsPending.mockReturnValue(false);

    const { result } = renderHook(() => useAccountTokensLoading());

    expect(result.current).toBe(false);
    expect(mockIsPending).toHaveBeenCalledWith(undefined);
  });
});
