import { renderHook } from '@testing-library/react-hooks';
import type { AccountGroupId } from '@metamask/account-api';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import {
  isAccountGroupAssetLoadPending,
  loadAccountGroupAssets,
} from '../../../../../core/Assets/accountGroupAssetLoader';
import { useEnsureAccountGroupAssets } from './useEnsureAccountGroupAssets';

jest.mock('../../../../../core/Assets/accountGroupAssetLoader', () => ({
  isAccountGroupAssetLoadPending: jest.fn(() => false),
  subscribeToAccountGroupAssetLoads: jest.fn(() => () => undefined),
  loadAccountGroupAssets: jest.fn(),
  selectEnabledCaipChainIds: jest.fn(),
}));

const GROUP_ID = 'entropy:wallet-1/2' as AccountGroupId;
const ACCOUNT = { id: 'account-1', address: '0xabc' } as InternalAccount;

let mockCaipChainIds: string[] = ['eip155:1'];
const mockGetAccountsByGroupId = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector: unknown) => {
    const loader = jest.requireMock(
      '../../../../../core/Assets/accountGroupAssetLoader',
    );
    const accounts = jest.requireMock(
      '../../../../../selectors/multichainAccounts/accounts',
    );

    if (selector === loader.selectEnabledCaipChainIds) {
      return mockCaipChainIds;
    }
    if (selector === accounts.selectInternalAccountsByGroupId) {
      return mockGetAccountsByGroupId;
    }
    return undefined;
  }),
}));

jest.mock('../../../../../selectors/multichainAccounts/accounts', () => ({
  selectInternalAccountsByGroupId: jest.fn(),
}));

const mockIsPending = jest.mocked(isAccountGroupAssetLoadPending);
const mockLoad = jest.mocked(loadAccountGroupAssets);

describe('useEnsureAccountGroupAssets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCaipChainIds = ['eip155:1'];
    mockGetAccountsByGroupId.mockReturnValue([ACCOUNT]);
    mockIsPending.mockReturnValue(false);
    mockLoad.mockResolvedValue(undefined);
  });

  it('requests an asset load for the given account group', () => {
    renderHook(() => useEnsureAccountGroupAssets(GROUP_ID));

    expect(mockLoad).toHaveBeenCalledWith({
      groups: [{ accountGroupId: GROUP_ID, accounts: [ACCOUNT] }],
      caipChainIds: ['eip155:1'],
    });
  });

  it('does nothing when no account group is given', () => {
    renderHook(() => useEnsureAccountGroupAssets(undefined));

    expect(mockLoad).not.toHaveBeenCalled();
  });

  it('does nothing when the group has no accounts', () => {
    mockGetAccountsByGroupId.mockReturnValue([]);

    renderHook(() => useEnsureAccountGroupAssets(GROUP_ID));

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
    const nextGroupId = 'entropy:wallet-1/3' as AccountGroupId;
    const { rerender } = renderHook(
      ({ groupId }: { groupId: AccountGroupId }) =>
        useEnsureAccountGroupAssets(groupId),
      { initialProps: { groupId: GROUP_ID } },
    );

    rerender({ groupId: nextGroupId });

    expect(mockLoad).toHaveBeenCalledTimes(2);
    expect(mockLoad).toHaveBeenLastCalledWith({
      groups: [{ accountGroupId: nextGroupId, accounts: [ACCOUNT] }],
      caipChainIds: ['eip155:1'],
    });
  });

  it('reports the pending state of that group', () => {
    mockIsPending.mockReturnValue(true);

    const { result } = renderHook(() => useEnsureAccountGroupAssets(GROUP_ID));

    expect(result.current).toBe(true);
    expect(mockIsPending).toHaveBeenCalledWith(GROUP_ID);
  });

  it('re-requests when the set of enabled chains changes', () => {
    const { rerender } = renderHook(() =>
      useEnsureAccountGroupAssets(GROUP_ID),
    );

    mockCaipChainIds = ['eip155:1', 'eip155:137'];
    rerender();

    expect(mockLoad).toHaveBeenCalledTimes(2);
    expect(mockLoad).toHaveBeenLastCalledWith({
      groups: [{ accountGroupId: GROUP_ID, accounts: [ACCOUNT] }],
      caipChainIds: ['eip155:1', 'eip155:137'],
    });
  });
});
