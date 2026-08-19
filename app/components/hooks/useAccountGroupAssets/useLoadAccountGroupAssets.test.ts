import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { selectIsAssetsUnifyStateEnabled } from '../../../selectors/featureFlagController/assetsUnifyState';
import {
  selectEvmEnabledCaipNetworks,
  selectEVMEnabledNetworks,
  selectNonEVMEnabledNetworks,
} from '../../../selectors/networkEnablementController';
import { selectInternalAccountsByGroupId } from '../../../selectors/multichainAccounts/accounts';
import { loadAccountGroupAssets } from '../../../core/Assets/accountGroupAssetLoader';
import { useLoadAccountGroupAssets } from './useLoadAccountGroupAssets';

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));

jest.mock('../../../core/Assets/accountGroupAssetLoader', () => ({
  loadAccountGroupAssets: jest.fn(),
}));

jest.mock('../../../selectors/featureFlagController/assetsUnifyState', () => ({
  selectIsAssetsUnifyStateEnabled: jest.fn(),
}));

jest.mock('../../../selectors/networkEnablementController', () => ({
  selectEvmEnabledCaipNetworks: jest.fn(),
  selectEVMEnabledNetworks: jest.fn(),
  selectNonEVMEnabledNetworks: jest.fn(),
}));

jest.mock('../../../selectors/multichainAccounts/accounts', () => ({
  selectInternalAccountsByGroupId: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockLoadAccountGroupAssets = jest.mocked(loadAccountGroupAssets);

const GROUP_1 = 'entropy:wallet-1/1';
const GROUP_2 = 'entropy:wallet-1/2';

const ACCOUNT_1 = { id: 'account-1', address: '0xAAA' };
const ACCOUNT_2 = { id: 'account-2', address: '0xBBB' };

const ACCOUNTS_BY_GROUP: Record<string, unknown[]> = {
  [GROUP_1]: [ACCOUNT_1],
  [GROUP_2]: [ACCOUNT_2],
  'entropy:wallet-1/3': [],
};

const getAccountsByGroupId = (groupId: string) =>
  ACCOUNTS_BY_GROUP[groupId] ?? [];

describe('useLoadAccountGroupAssets', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectIsAssetsUnifyStateEnabled) return true;
      if (selector === selectInternalAccountsByGroupId)
        return getAccountsByGroupId;
      if (selector === selectEvmEnabledCaipNetworks) return ['eip155:1'];
      if (selector === selectEVMEnabledNetworks) return ['0x1'];
      if (selector === selectNonEVMEnabledNetworks) return ['solana:mainnet'];
      return undefined;
    });
  });

  it('resolves group ids to their accounts and enabled chains', () => {
    const { result } = renderHook(() => useLoadAccountGroupAssets());

    result.current([GROUP_1, GROUP_2]);

    expect(mockLoadAccountGroupAssets).toHaveBeenCalledWith({
      groups: [
        { accountGroupId: GROUP_1, accounts: [ACCOUNT_1] },
        { accountGroupId: GROUP_2, accounts: [ACCOUNT_2] },
      ],
      caipChainIds: ['eip155:1', 'solana:mainnet'],
      evmChainIds: ['0x1'],
      isAssetsUnifyStateEnabled: true,
    });
  });

  it('does nothing for an empty group list', () => {
    const { result } = renderHook(() => useLoadAccountGroupAssets());

    result.current([]);

    expect(mockLoadAccountGroupAssets).not.toHaveBeenCalled();
  });

  it('skips groups with no accounts', () => {
    const { result } = renderHook(() => useLoadAccountGroupAssets());

    result.current(['entropy:wallet-1/3']);

    expect(mockLoadAccountGroupAssets).not.toHaveBeenCalled();
  });

  it('skips unknown group ids', () => {
    const { result } = renderHook(() => useLoadAccountGroupAssets());

    result.current(['entropy:wallet-9/9', GROUP_1]);

    expect(mockLoadAccountGroupAssets).toHaveBeenCalledWith(
      expect.objectContaining({
        groups: [{ accountGroupId: GROUP_1, accounts: [ACCOUNT_1] }],
      }),
    );
  });

  it('returns a stable callback across re-renders', () => {
    const { result, rerender } = renderHook(() => useLoadAccountGroupAssets());
    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
  });

  it('passes the legacy flag through when unified state is disabled', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectIsAssetsUnifyStateEnabled) return false;
      if (selector === selectInternalAccountsByGroupId)
        return getAccountsByGroupId;
      if (selector === selectEvmEnabledCaipNetworks) return ['eip155:1'];
      if (selector === selectEVMEnabledNetworks) return ['0x1'];
      if (selector === selectNonEVMEnabledNetworks) return [];
      return undefined;
    });

    const { result } = renderHook(() => useLoadAccountGroupAssets());

    result.current([GROUP_1]);

    expect(mockLoadAccountGroupAssets).toHaveBeenCalledWith(
      expect.objectContaining({ isAssetsUnifyStateEnabled: false }),
    );
  });
});
