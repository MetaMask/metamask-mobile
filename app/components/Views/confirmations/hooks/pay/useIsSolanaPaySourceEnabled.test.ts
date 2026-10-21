import { TransactionType } from '@metamask/transaction-controller';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { selectSolanaPayEnabled } from '../../../../../selectors/featureFlagController/confirmations';
import { useIsSolanaPaySourceEnabled } from './useIsSolanaPaySourceEnabled';

jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock(
  '../../../../../selectors/featureFlagController/confirmations',
  () => ({
    selectSolanaPayEnabled: jest.fn(),
  }),
);

function runHook(type: TransactionType, isSolanaPayEnabled: boolean) {
  jest.mocked(selectSolanaPayEnabled).mockReturnValue(isSolanaPayEnabled);
  jest.mocked(useTransactionMetadataRequest).mockReturnValue({
    type,
  } as ReturnType<typeof useTransactionMetadataRequest>);

  return renderHookWithProvider(useIsSolanaPaySourceEnabled).result.current;
}

describe('useIsSolanaPaySourceEnabled', () => {
  it.each([TransactionType.perpsDeposit, TransactionType.predictDeposit])(
    'returns true for %s when the Solana Pay flag is on',
    (type) => {
      expect(runHook(type, true)).toBe(true);
    },
  );

  it('returns false when the Solana Pay flag is off', () => {
    expect(runHook(TransactionType.perpsDeposit, false)).toBe(false);
  });

  it.each([
    TransactionType.moneyAccountDeposit,
    TransactionType.perpsDepositAndOrder,
    TransactionType.predictDepositAndOrder,
    TransactionType.predictWithdraw,
  ])('returns false for unsupported %s', (type) => {
    expect(runHook(type, true)).toBe(false);
  });
});
