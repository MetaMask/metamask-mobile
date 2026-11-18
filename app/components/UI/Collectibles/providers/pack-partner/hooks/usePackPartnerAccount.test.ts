import { SolScope } from '@metamask/keyring-api';
import { selectSelectedInternalAccountByScope } from '../../../../../../selectors/multichainAccounts/accounts';
import {
  MOCK_ACCOUNT,
  MOCK_INTERNAL_ACCOUNT,
  renderHookWithQueryClient,
} from '../../../views/testUtils';
import { usePackPartnerAccount } from './usePackPartnerAccount';

jest.mock('../../../../../../selectors/multichainAccounts/accounts', () => ({
  ...jest.requireActual(
    '../../../../../../selectors/multichainAccounts/accounts',
  ),
  selectSelectedInternalAccountByScope: jest.fn(),
}));

const mockAccountByScope = jest.fn();

describe('usePackPartnerAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(selectSelectedInternalAccountByScope)
      .mockReturnValue(mockAccountByScope);
  });

  it('returns the id and address of the selected Solana mainnet account', () => {
    mockAccountByScope.mockReturnValue(MOCK_INTERNAL_ACCOUNT);

    const { result } = renderHookWithQueryClient(() => usePackPartnerAccount());

    expect(result.current).toStrictEqual(MOCK_ACCOUNT);
    expect(mockAccountByScope).toHaveBeenCalledWith(SolScope.Mainnet);
  });

  it('returns undefined when the account group has no Solana account', () => {
    mockAccountByScope.mockReturnValue(undefined);

    const { result } = renderHookWithQueryClient(() => usePackPartnerAccount());

    expect(result.current).toBeUndefined();
  });

  it('keeps the same reference across renders', () => {
    mockAccountByScope.mockReturnValue(MOCK_INTERNAL_ACCOUNT);
    const { result, rerender } = renderHookWithQueryClient(() =>
      usePackPartnerAccount(),
    );
    const first = result.current;

    rerender({});

    expect(result.current).toBe(first);
  });
});
