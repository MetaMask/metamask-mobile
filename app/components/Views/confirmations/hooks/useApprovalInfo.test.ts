import { cloneDeep } from 'lodash';
import {
  siweSignatureConfirmationState,
  typedSignV1ConfirmationState,
} from '../../../../util/test/confirm-data-helpers';
import { transferTransactionStateMock } from '../__mocks__/transfer-transaction-mock';
import { generateStablecoinLendingDepositConfirmationState } from '../__mocks__/controllers/transaction-batch-mock';
import { RootState } from '../../../../reducers';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { useApprovalInfo } from './useApprovalInfo';

describe('useApprovalInfo', () => {
  it('returns null if no approval request is found', async () => {
    const noApprovalState = cloneDeep(transferTransactionStateMock);

    noApprovalState.engine.backgroundState.ApprovalController.pendingApprovals =
      {};

    const { result } = renderHookWithProvider(() => useApprovalInfo(), {
      state: noApprovalState,
    });
    expect(result.current).toBeNull();
  });

  describe('signature requests', () => {
    it('returns the correct info', async () => {
      const { result } = renderHookWithProvider(() => useApprovalInfo(), {
        state: typedSignV1ConfirmationState,
      });

      expect(result.current).toEqual({
        chainId: '0x1',
        fromAddress: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477',
        isSIWEMessage: undefined,
        url: 'https://metamask.github.io/test-dapp/',
      });
    });

    it('returns isSIWEMessage as true if the signature request is a SIWE message', async () => {
      const { result } = renderHookWithProvider(() => useApprovalInfo(), {
        state: siweSignatureConfirmationState as unknown as RootState,
      });

      expect(result.current?.isSIWEMessage).toEqual(true);
    });
  });

  it('returns the correct info for transaction metadata', async () => {
    const { result } = renderHookWithProvider(() => useApprovalInfo(), {
      state: transferTransactionStateMock,
    });

    expect(result.current).toEqual({
      chainId: '0x1',
      fromAddress: '0xdc47789de4ceff0e8fe9d15d728af7f17550c164',
      isSIWEMessage: undefined,
      url: 'metamask',
    });
  });

  it('returns the correct info for transaction batches metadata', async () => {
    const { result } = renderHookWithProvider(() => useApprovalInfo(), {
      state: generateStablecoinLendingDepositConfirmationState,
    });

    expect(result.current).toEqual({
      chainId: '0x1',
      fromAddress: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477',
      isSIWEMessage: undefined,
      url: 'metamask',
    });
  });
});
