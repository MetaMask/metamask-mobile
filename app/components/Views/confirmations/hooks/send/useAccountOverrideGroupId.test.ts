import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { selectInternalAccountsById } from '../../../../../selectors/accountsController';
import { selectAccountToGroupMap } from '../../../../../selectors/multichainAccounts/accountTreeController';
import { useTransactionAccountOverride } from '../transactions/useTransactionAccountOverride';
import { useAccountOverrideGroupId } from './useAccountOverrideGroupId';

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));

jest.mock('../../../../../selectors/accountsController', () => ({
  selectInternalAccountsById: jest.fn(),
}));

jest.mock(
  '../../../../../selectors/multichainAccounts/accountTreeController',
  () => ({ selectAccountToGroupMap: jest.fn() }),
);

jest.mock('../transactions/useTransactionAccountOverride', () => ({
  useTransactionAccountOverride: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseTransactionAccountOverride = jest.mocked(
  useTransactionAccountOverride,
);

const ACCOUNTS_BY_ID = {
  'account-1': { id: 'account-1', address: '0xAAA' },
  'account-2': { id: 'account-2', address: '0xBBB' },
};

const ACCOUNT_TO_GROUP_MAP = {
  'account-1': { id: 'entropy:wallet-1/1' },
  'account-2': { id: 'entropy:wallet-1/2' },
};

describe('useAccountOverrideGroupId', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectInternalAccountsById) return ACCOUNTS_BY_ID;
      if (selector === selectAccountToGroupMap) return ACCOUNT_TO_GROUP_MAP;
      return undefined;
    });
  });

  it('returns the group of the override account', () => {
    mockUseTransactionAccountOverride.mockReturnValue('0xBBB');

    const { result } = renderHook(() => useAccountOverrideGroupId());

    expect(result.current).toBe('entropy:wallet-1/2');
  });

  it('matches the override address case-insensitively', () => {
    mockUseTransactionAccountOverride.mockReturnValue('0xbbb');

    const { result } = renderHook(() => useAccountOverrideGroupId());

    expect(result.current).toBe('entropy:wallet-1/2');
  });

  it('returns undefined when no override is active', () => {
    mockUseTransactionAccountOverride.mockReturnValue(undefined);

    const { result } = renderHook(() => useAccountOverrideGroupId());

    expect(result.current).toBeUndefined();
  });

  it('returns undefined for an unknown override address', () => {
    mockUseTransactionAccountOverride.mockReturnValue('0xDEAD');

    const { result } = renderHook(() => useAccountOverrideGroupId());

    expect(result.current).toBeUndefined();
  });

  it('returns undefined when the account belongs to no group', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectInternalAccountsById) return ACCOUNTS_BY_ID;
      if (selector === selectAccountToGroupMap) return {};
      return undefined;
    });
    mockUseTransactionAccountOverride.mockReturnValue('0xAAA');

    const { result } = renderHook(() => useAccountOverrideGroupId());

    expect(result.current).toBeUndefined();
  });
});
