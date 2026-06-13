import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useMoneyAccount } from './useMoneyAccount';
import { EthAccountType } from '@metamask/keyring-api';
import { KeyringTypes } from '@metamask/keyring-controller';
import { createMockInternalAccount } from '../../../util/test/accountsControllerTestUtils';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockEvmAccount = createMockInternalAccount(
  '0x1111111111111111111111111111111111111111',
  'Account 1',
  KeyringTypes.hd,
  EthAccountType.Eoa,
);

describe('useMoneyAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the money account from the selector', () => {
    (useSelector as jest.Mock).mockReturnValue(mockEvmAccount);

    const { result } = renderHook(() => useMoneyAccount());

    expect(result.current).toBe(mockEvmAccount);
  });

  it('returns undefined when no EVM account exists', () => {
    (useSelector as jest.Mock).mockReturnValue(undefined);

    const { result } = renderHook(() => useMoneyAccount());

    expect(result.current).toBeUndefined();
  });
});
