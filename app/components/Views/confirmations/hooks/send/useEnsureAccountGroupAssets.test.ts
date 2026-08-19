import { renderHook } from '@testing-library/react-hooks';
import type { AccountGroupId } from '@metamask/account-api';
import { isAccountGroupAssetLoadPending } from '../../../../../core/Assets/accountGroupAssetLoader';
import { useLoadAccountGroupAssets } from '../../../../hooks/useAccountGroupAssets/useLoadAccountGroupAssets';
import { useEnsureAccountGroupAssets } from './useEnsureAccountGroupAssets';

jest.mock('../../../../../core/Assets/accountGroupAssetLoader', () => ({
  isAccountGroupAssetLoadPending: jest.fn(() => false),
  subscribeToAccountGroupAssetLoads: jest.fn(() => () => undefined),
}));

jest.mock(
  '../../../../hooks/useAccountGroupAssets/useLoadAccountGroupAssets',
  () => ({ useLoadAccountGroupAssets: jest.fn() }),
);

const mockIsPending = jest.mocked(isAccountGroupAssetLoadPending);
const mockUseLoadAccountGroupAssets = jest.mocked(useLoadAccountGroupAssets);
const mockLoad = jest.fn();

const GROUP_ID = 'entropy:wallet-1/2' as AccountGroupId;

describe('useEnsureAccountGroupAssets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLoadAccountGroupAssets.mockReturnValue(mockLoad);
    mockIsPending.mockReturnValue(false);
  });

  it('requests an asset load for the given account group', () => {
    renderHook(() => useEnsureAccountGroupAssets(GROUP_ID));

    expect(mockLoad).toHaveBeenCalledWith([GROUP_ID]);
  });

  it('does nothing when no account group is given', () => {
    renderHook(() => useEnsureAccountGroupAssets(undefined));

    expect(mockLoad).not.toHaveBeenCalled();
  });

  it('does not re-request on re-render with the same group', () => {
    const { rerender } = renderHook(() =>
      useEnsureAccountGroupAssets(GROUP_ID),
    );
    rerender();

    expect(mockLoad).toHaveBeenCalledTimes(1);
  });

  it('requests again when the group changes', () => {
    const { rerender } = renderHook(
      ({ groupId }: { groupId: AccountGroupId }) =>
        useEnsureAccountGroupAssets(groupId),
      { initialProps: { groupId: GROUP_ID } },
    );

    rerender({ groupId: 'entropy:wallet-1/3' as AccountGroupId });

    expect(mockLoad).toHaveBeenCalledTimes(2);
    expect(mockLoad).toHaveBeenLastCalledWith(['entropy:wallet-1/3']);
  });

  it('reports the pending state of that group', () => {
    mockIsPending.mockReturnValue(true);

    const { result } = renderHook(() => useEnsureAccountGroupAssets(GROUP_ID));

    expect(result.current).toBe(true);
    expect(mockIsPending).toHaveBeenCalledWith(GROUP_ID);
  });
});
