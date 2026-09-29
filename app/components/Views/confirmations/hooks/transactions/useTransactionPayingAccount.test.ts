import { renderHook } from '@testing-library/react-hooks';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';

import { useTransactionAccountOverride } from './useTransactionAccountOverride';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';
import { useTransactionPayingAccount } from './useTransactionPayingAccount';

jest.mock('./useTransactionAccountOverride');
jest.mock('./useTransactionMetadataRequest');

const SIGNER_ADDRESS = '0x1111111111111111111111111111111111111111' as Hex;
const OVERRIDE_ADDRESS = '0x2222222222222222222222222222222222222222' as Hex;

const useTransactionAccountOverrideMock = jest.mocked(
  useTransactionAccountOverride,
);
const useTransactionMetadataRequestMock = jest.mocked(
  useTransactionMetadataRequest,
);

describe('useTransactionPayingAccount', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.moneyAccountDeposit,
      txParams: { from: SIGNER_ADDRESS },
    } as TransactionMeta);
  });

  it('returns account override for standard pay transactions', () => {
    useTransactionAccountOverrideMock.mockReturnValue(OVERRIDE_ADDRESS);

    const { result } = renderHook(() => useTransactionPayingAccount());

    expect(result.current).toBe(OVERRIDE_ADDRESS);
  });

  it('returns signer address for post-quote withdrawals', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.moneyAccountWithdraw,
      txParams: { from: SIGNER_ADDRESS },
    } as TransactionMeta);
    useTransactionAccountOverrideMock.mockReturnValue(OVERRIDE_ADDRESS);

    const { result } = renderHook(() => useTransactionPayingAccount());

    expect(result.current).toBe(SIGNER_ADDRESS);
  });

  it('returns signer address when account override is unavailable', () => {
    useTransactionAccountOverrideMock.mockReturnValue(undefined);

    const { result } = renderHook(() => useTransactionPayingAccount());

    expect(result.current).toBe(SIGNER_ADDRESS);
  });
});
