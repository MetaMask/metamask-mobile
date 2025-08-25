import {
  TransactionMeta,
  TransactionParams,
} from '@metamask/transaction-controller';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useTransactionMaxGasCost } from './useTransactionMaxGasCost';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { cloneDeep, merge } from 'lodash';

function runHook({
  noTransaction,
  txParams,
}: { noTransaction?: boolean; txParams?: Partial<TransactionParams> } = {}) {
  const state = cloneDeep(
    merge(
      simpleSendTransactionControllerMock,
      transactionApprovalControllerMock,
    ),
  );

  if (txParams) {
    const transactionMeta = state.engine.backgroundState.TransactionController
      .transactions[0] as TransactionMeta;

    transactionMeta.txParams = {
      ...transactionMeta.txParams,
      ...txParams,
    };
  }

  if (noTransaction) {
    state.engine.backgroundState.TransactionController.transactions = [];
  }

  return renderHookWithProvider(useTransactionMaxGasCost, { state }).result
    .current;
}

describe('useTransactionMaxGasCost', () => {
  it('returns undefined if no transaction', () => {
    const result = runHook({ noTransaction: true });
    expect(result).toBeUndefined();
  });

  it('returns total cost if EIP-1559', () => {
    const result = runHook({ txParams: { maxFeePerGas: '0x3', gas: '0x4' } });
    expect(result).toBe('0xc');
  });

  it('returns total cost if legacy', () => {
    const result = runHook({
      txParams: { gasPrice: '0x2', gas: '0x4', maxFeePerGas: undefined },
    });
    expect(result).toBe('0x8');
  });
});
