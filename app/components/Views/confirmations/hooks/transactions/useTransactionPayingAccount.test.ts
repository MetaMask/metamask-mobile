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
const LEDGER_ADDRESS = '0x3333333333333333333333333333333333333333' as Hex;
const QR_ADDRESS = '0x4444444444444444444444444444444444444444' as Hex;
const ONEKEY_ADDRESS = '0x5555555555555555555555555555555555555555' as Hex;

const HARDWARE_RECIPIENT_CASES = [
  ['Ledger', LEDGER_ADDRESS],
  ['QR', QR_ADDRESS],
  ['OneKey', ONEKEY_ADDRESS],
] as const;

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

  it.each(HARDWARE_RECIPIENT_CASES)(
    'returns %s hardware override as payer for money account deposits',
    (_label, hardwareAddress) => {
      useTransactionAccountOverrideMock.mockReturnValue(hardwareAddress);

      const { result } = renderHook(() => useTransactionPayingAccount());

      expect(result.current).toBe(hardwareAddress);
    },
  );

  it('returns signer address for post-quote withdrawals with a software recipient', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.moneyAccountWithdraw,
      txParams: { from: SIGNER_ADDRESS },
    } as TransactionMeta);
    useTransactionAccountOverrideMock.mockReturnValue(OVERRIDE_ADDRESS);

    const { result } = renderHook(() => useTransactionPayingAccount());

    expect(result.current).toBe(SIGNER_ADDRESS);
  });

  it.each(HARDWARE_RECIPIENT_CASES)(
    'returns signer address for money account withdrawals with a %s hardware recipient',
    (_label, hardwareAddress) => {
      useTransactionMetadataRequestMock.mockReturnValue({
        type: TransactionType.moneyAccountWithdraw,
        txParams: { from: SIGNER_ADDRESS },
      } as TransactionMeta);
      useTransactionAccountOverrideMock.mockReturnValue(hardwareAddress);

      const { result } = renderHook(() => useTransactionPayingAccount());

      expect(result.current).toBe(SIGNER_ADDRESS);
    },
  );

  it.each(HARDWARE_RECIPIENT_CASES)(
    'returns signer address for a batch containing moneyAccountWithdraw with a %s hardware recipient',
    (_label, hardwareAddress) => {
      useTransactionMetadataRequestMock.mockReturnValue({
        type: TransactionType.batch,
        nestedTransactions: [
          { type: TransactionType.moneyAccountWithdraw },
          { type: TransactionType.tokenMethodTransfer },
        ],
        txParams: { from: SIGNER_ADDRESS },
      } as unknown as TransactionMeta);
      useTransactionAccountOverrideMock.mockReturnValue(hardwareAddress);

      const { result } = renderHook(() => useTransactionPayingAccount());

      expect(result.current).toBe(SIGNER_ADDRESS);
    },
  );

  it('returns signer address when account override is unavailable', () => {
    useTransactionAccountOverrideMock.mockReturnValue(undefined);

    const { result } = renderHook(() => useTransactionPayingAccount());

    expect(result.current).toBe(SIGNER_ADDRESS);
  });
});
