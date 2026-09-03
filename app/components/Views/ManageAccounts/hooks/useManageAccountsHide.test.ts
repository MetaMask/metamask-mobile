import { act } from '@testing-library/react-native';
import { AccountGroupId } from '@metamask/account-api';
import Engine from '../../../../core/Engine';
import {
  createMockAccountGroup,
  createMockEntropyWallet,
  createMockHiddenAccountGroup,
  createMockState,
  createMockWallet,
} from '../../../../component-library/components-temp/MultichainAccounts/test-utils';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import useManageAccountsHide from './useManageAccountsHide';

jest.mock('../../../../core/Engine', () => ({
  context: {
    AccountTreeController: {
      setAccountGroupHidden: jest.fn(),
      syncWithUserStorage: jest.fn(),
    },
  },
}));

const mockSetAccountGroupHidden = jest.mocked(
  Engine.context.AccountTreeController.setAccountGroupHidden,
);
const mockSyncWithUserStorage = jest.mocked(
  Engine.context.AccountTreeController.syncWithUserStorage,
);

const renderUseManageAccountsHide = (
  state: ReturnType<typeof createMockState>,
) => renderHookWithProvider(() => useManageAccountsHide(), { state });

const createStateWithSingleGroup = (
  groupId: AccountGroupId,
  { hidden = false }: { hidden?: boolean } = {},
) => {
  const group = hidden
    ? createMockHiddenAccountGroup(groupId, 'Group 1')
    : createMockAccountGroup(groupId, 'Group 1');
  const wallet = createMockWallet('wallet-1', 'Wallet 1', [group]);
  return createMockState([wallet], {});
};

describe('useManageAccountsHide', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    {
      name: 'calls setAccountGroupHidden with true when the group is currently visible',
      hidden: false,
      expectedHidden: true,
    },
    {
      name: 'calls setAccountGroupHidden with false when the group is currently hidden',
      hidden: true,
      expectedHidden: false,
    },
  ])('$name', ({ hidden, expectedHidden }) => {
    const groupId = 'wallet-1/group-1' as AccountGroupId;
    const state = createStateWithSingleGroup(groupId, { hidden });

    const { result } = renderUseManageAccountsHide(state);
    act(() => {
      result.current.toggleHidden(groupId);
    });

    expect(mockSetAccountGroupHidden).toHaveBeenCalledTimes(1);
    expect(mockSetAccountGroupHidden).toHaveBeenCalledWith(
      groupId,
      expectedHidden,
    );
  });

  it('reads hidden state from the current store, not a cached value, per group', () => {
    const visibleGroupId = 'wallet-1/group-1' as AccountGroupId;
    const hiddenGroupId = 'wallet-2/group-1' as AccountGroupId;
    const visibleGroup = createMockAccountGroup(visibleGroupId, 'Group 1');
    const wallet1 = createMockWallet('wallet-1', 'Wallet 1', [visibleGroup]);
    const hiddenGroup = createMockHiddenAccountGroup(hiddenGroupId, 'Group 2');
    const wallet2 = createMockEntropyWallet('wallet-2', 'Wallet 2', [
      hiddenGroup,
    ]);
    const state = createMockState([wallet1, wallet2], {});

    const { result } = renderUseManageAccountsHide(state);
    act(() => {
      result.current.toggleHidden(visibleGroupId);
      result.current.toggleHidden(hiddenGroupId);
    });

    expect(mockSetAccountGroupHidden).toHaveBeenCalledWith(
      visibleGroupId,
      true,
    );
    expect(mockSetAccountGroupHidden).toHaveBeenCalledWith(
      hiddenGroupId,
      false,
    );
  });

  it('does not call syncWithUserStorage when toggling hidden state', () => {
    const groupId = 'wallet-1/group-1' as AccountGroupId;
    const state = createStateWithSingleGroup(groupId);

    const { result } = renderUseManageAccountsHide(state);
    act(() => {
      result.current.toggleHidden(groupId);
    });

    expect(mockSyncWithUserStorage).not.toHaveBeenCalled();
  });
});
