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

jest.mock('../../../../selectors/cardController', () => ({
  selectCardPrimaryToken: jest.fn(),
}));

jest.mock('../../../../selectors/accountsController', () => ({
  getMemoizedInternalAccountByAddress: jest.fn(),
  selectSelectedInternalAccount: jest.fn(),
}));

jest.mock(
  '../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectAccountToGroupMap: jest.fn(),
  }),
);

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseAccountGroupName = useAccountGroupName as jest.MockedFunction<
  typeof useAccountGroupName
>;

const FUNDING = {
  address: '0xFunding',
  id: 'funding-id',
  metadata: { name: 'Funding Account' },
};
const SELECTED = {
  address: '0xSelected',
  id: 'selected-id',
  metadata: { name: 'Selected Account' },
};

describe('useFundingAccountName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prefers the funding account group name over the selected account', () => {
    mockUseAccountGroupName.mockReturnValue('Selected Group');
    mockUseSelector.mockImplementation((selector) => {
      const result = selector({} as never);
      return result;
    });

    // Drive the hook via selector return values in call order:
    // selectCardPrimaryToken, getMemoizedInternalAccountByAddress,
    // selectAccountToGroupMap, selectSelectedInternalAccount
    const { selectCardPrimaryToken } = jest.requireMock(
      '../../../../selectors/cardController',
    );
    const {
      getMemoizedInternalAccountByAddress,
      selectSelectedInternalAccount,
    } = jest.requireMock('../../../../selectors/accountsController');
    const { selectAccountToGroupMap } = jest.requireMock(
      '../../../../selectors/multichainAccounts/accountTreeController',
    );

    selectCardPrimaryToken.mockReturnValue({ walletAddress: FUNDING.address });
    getMemoizedInternalAccountByAddress.mockReturnValue(FUNDING);
    selectAccountToGroupMap.mockReturnValue({
      [FUNDING.id]: { metadata: { name: 'Funding Group' } },
    });
    selectSelectedInternalAccount.mockReturnValue(SELECTED);

    const { result } = renderHook(() => useFundingAccountName());

    expect(result.current).toBe('Funding Group');
  });

  it('uses the selected group name when the funding wallet is selected', () => {
    mockUseAccountGroupName.mockReturnValue('Funding Group');
    const { selectCardPrimaryToken } = jest.requireMock(
      '../../../../selectors/cardController',
    );
    const {
      getMemoizedInternalAccountByAddress,
      selectSelectedInternalAccount,
    } = jest.requireMock('../../../../selectors/accountsController');
    const { selectAccountToGroupMap } = jest.requireMock(
      '../../../../selectors/multichainAccounts/accountTreeController',
    );

    selectCardPrimaryToken.mockReturnValue({ walletAddress: FUNDING.address });
    getMemoizedInternalAccountByAddress.mockReturnValue(FUNDING);
    selectAccountToGroupMap.mockReturnValue({});
    selectSelectedInternalAccount.mockReturnValue(FUNDING);
    mockUseSelector.mockImplementation((selector) => selector({} as never));

    const { result } = renderHook(() => useFundingAccountName());

    expect(result.current).toBe('Funding Group');
  });

  it('falls back to funding account.metadata.name when the group name is unset', () => {
    mockUseAccountGroupName.mockReturnValue(null);
    const { selectCardPrimaryToken } = jest.requireMock(
      '../../../../selectors/cardController',
    );
    const {
      getMemoizedInternalAccountByAddress,
      selectSelectedInternalAccount,
    } = jest.requireMock('../../../../selectors/accountsController');
    const { selectAccountToGroupMap } = jest.requireMock(
      '../../../../selectors/multichainAccounts/accountTreeController',
    );

    selectCardPrimaryToken.mockReturnValue({ walletAddress: FUNDING.address });
    getMemoizedInternalAccountByAddress.mockReturnValue(FUNDING);
    selectAccountToGroupMap.mockReturnValue({});
    selectSelectedInternalAccount.mockReturnValue(SELECTED);
    mockUseSelector.mockImplementation((selector) => selector({} as never));

    const { result } = renderHook(() => useFundingAccountName());

    expect(result.current).toBe('Funding Account');
  });

  it('returns an empty string when neither name is available', () => {
    mockUseAccountGroupName.mockReturnValue(null);
    const { selectCardPrimaryToken } = jest.requireMock(
      '../../../../selectors/cardController',
    );
    const {
      getMemoizedInternalAccountByAddress,
      selectSelectedInternalAccount,
    } = jest.requireMock('../../../../selectors/accountsController');
    const { selectAccountToGroupMap } = jest.requireMock(
      '../../../../selectors/multichainAccounts/accountTreeController',
    );

    selectCardPrimaryToken.mockReturnValue(null);
    getMemoizedInternalAccountByAddress.mockReturnValue(undefined);
    selectAccountToGroupMap.mockReturnValue({});
    selectSelectedInternalAccount.mockReturnValue(null);
    mockUseSelector.mockImplementation((selector) => selector({} as never));

    const { result } = renderHook(() => useFundingAccountName());

    expect(result.current).toBe('');
  });
});
