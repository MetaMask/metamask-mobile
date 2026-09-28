import { merge } from 'lodash';
import { act } from '@testing-library/react-native';
import {
  TransactionMeta,
  updateEIP7702BatchData,
} from '@metamask/transaction-controller';
import { TransactionPayRequiredToken } from '@metamask/transaction-pay-controller';
import { Hex } from '@metamask/utils';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useUpdateTransactionPayAmount } from './useUpdateTransactionPayAmount';
import {
  simpleSendTransactionControllerMock,
  transactionIdMock,
} from '../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { otherControllersMock } from '../../__mocks__/controllers/other-controllers-mock';
import { getTransactionPayAmountCalls } from '../../external/types/transaction-pay-amount';
import { useTransactionAccountOverride } from '../transactions/useTransactionAccountOverride';
import { useUpdateTokenAmount } from '../transactions/useUpdateTokenAmount';
import { useTransactionPayRequiredTokens } from './useTransactionPayData';
import Engine from '../../../../../core/Engine';

jest.mock('@metamask/transaction-controller', () => ({
  ...jest.requireActual('@metamask/transaction-controller'),
  updateEIP7702BatchData: jest.fn(),
}));
jest.mock('../../../../../core/Engine', () => ({
  context: {
    TransactionController: {
      updateTransactionMetadata: jest.fn(),
    },
  },
}));
jest.mock('../../external/types/transaction-pay-amount');
jest.mock('../transactions/useTransactionAccountOverride');
jest.mock('../transactions/useUpdateTokenAmount');
jest.mock('./useTransactionPayData');

const AMOUNT_MOCK = '1.23';
const TOKEN_ADDRESS_MOCK = '0xToken' as Hex;
const BATCH_DATA_MOCK = '0xbatch' as Hex;
const OVERRIDE_ADDRESS_MOCK =
  '0x1111111111111111111111111111111111111111' as Hex;

// Money account deposits and withdrawals both re-encode two nested calls.
const CALLS_MOCK = [
  { nestedTransactionIndex: 0, transactionData: '0xaaaa' as Hex },
  { nestedTransactionIndex: 1, transactionData: '0xbbbb' as Hex },
];

const requiredAssetMock = {
  address: TOKEN_ADDRESS_MOCK,
  amount: '0x0' as Hex,
  standard: 'erc20',
};

function runHook({
  transactionMeta,
}: { transactionMeta?: Partial<TransactionMeta> } = {}) {
  return renderHookWithProvider(useUpdateTransactionPayAmount, {
    state: merge(
      {},
      simpleSendTransactionControllerMock,
      transactionApprovalControllerMock,
      otherControllersMock,
      transactionMeta
        ? {
            engine: {
              backgroundState: {
                TransactionController: { transactions: [transactionMeta] },
              },
            },
          }
        : {},
    ),
  });
}

/** Runs the metadata callback captured from `updateTransactionMetadata`. */
function applyMetadataCallback(meta: Partial<TransactionMeta>) {
  const [request] = jest.mocked(
    Engine.context.TransactionController.updateTransactionMetadata,
  ).mock.calls[0];

  request.callback(meta as TransactionMeta);
  return meta;
}

describe('useUpdateTransactionPayAmount', () => {
  const updateTransactionMetadataMock = jest.mocked(
    Engine.context.TransactionController.updateTransactionMetadata,
  );
  const updateEIP7702BatchDataMock = jest.mocked(updateEIP7702BatchData);
  const getTransactionPayAmountCallsMock = jest.mocked(
    getTransactionPayAmountCalls,
  );
  const updateTokenAmountMock = jest.fn();
  const useUpdateTokenAmountMock = jest.mocked(useUpdateTokenAmount);
  const useTransactionAccountOverrideMock = jest.mocked(
    useTransactionAccountOverride,
  );
  const useTransactionPayRequiredTokensMock = jest.mocked(
    useTransactionPayRequiredTokens,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    getTransactionPayAmountCallsMock.mockResolvedValue(CALLS_MOCK);
    updateEIP7702BatchDataMock.mockReturnValue({
      nestedTransactions: [],
      transactionData: BATCH_DATA_MOCK,
    });
    updateTokenAmountMock.mockResolvedValue(undefined);
    useUpdateTokenAmountMock.mockReturnValue({
      updateTokenAmount: updateTokenAmountMock,
    });
    useTransactionAccountOverrideMock.mockReturnValue(undefined);
    useTransactionPayRequiredTokensMock.mockReturnValue([
      { decimals: 6 } as TransactionPayRequiredToken,
    ]);
  });

  describe('updateTransactionPayAmount', () => {
    it('falls back to the token amount update when there are no external calls', async () => {
      getTransactionPayAmountCallsMock.mockResolvedValue(undefined);

      const { result } = runHook();
      await act(async () => {
        await result.current.updateTransactionPayAmount(AMOUNT_MOCK);
      });

      expect(updateTokenAmountMock).toHaveBeenCalledWith(AMOUNT_MOCK);
      expect(updateTransactionMetadataMock).not.toHaveBeenCalled();
    });

    it('passes the account override to the external module', async () => {
      useTransactionAccountOverrideMock.mockReturnValue(OVERRIDE_ADDRESS_MOCK);

      const { result } = runHook({
        transactionMeta: { requiredAssets: [requiredAssetMock] },
      });
      await act(async () => {
        await result.current.updateTransactionPayAmount(AMOUNT_MOCK);
      });

      expect(getTransactionPayAmountCallsMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: transactionIdMock }),
        AMOUNT_MOCK,
        OVERRIDE_ADDRESS_MOCK,
      );
    });

    it('commits calldata and required assets in a single state update', async () => {
      const { result } = runHook({
        transactionMeta: { requiredAssets: [requiredAssetMock] },
      });
      await act(async () => {
        await result.current.updateTransactionPayAmount(AMOUNT_MOCK);
      });

      expect(updateTransactionMetadataMock).toHaveBeenCalledTimes(1);
      expect(updateTransactionMetadataMock).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionId: transactionIdMock,
          skipResimulate: true,
        }),
      );

      const meta = applyMetadataCallback({
        txParams: { from: '0xabc' as Hex },
        requiredAssets: [requiredAssetMock],
      });

      expect(meta.txParams?.data).toBe(BATCH_DATA_MOCK);
      // 1.23 at 6 decimals -> 1230000 -> 0x12c4b0
      expect(meta.requiredAssets).toStrictEqual([
        { ...requiredAssetMock, amount: '0x12c4b0' },
      ]);
    });

    it('uses the call data directly when there is a single call', async () => {
      getTransactionPayAmountCallsMock.mockResolvedValue([
        { nestedTransactionIndex: 0, transactionData: '0xsingle' as Hex },
      ]);

      const { result } = runHook({
        transactionMeta: { requiredAssets: [requiredAssetMock] },
      });
      await act(async () => {
        await result.current.updateTransactionPayAmount(AMOUNT_MOCK);
      });

      const meta = applyMetadataCallback({
        txParams: { from: '0xabc' as Hex },
        nestedTransactions: [{ to: '0xdef' as Hex, data: '0xold' as Hex }],
      } as Partial<TransactionMeta>);

      expect(updateEIP7702BatchDataMock).not.toHaveBeenCalled();
      expect(meta.txParams?.data).toBe('0xsingle');
      expect(meta.nestedTransactions).toStrictEqual([
        { to: '0xdef', data: '0xsingle' },
      ]);
    });

    it('rounds the required asset amount down', async () => {
      const { result } = runHook({
        transactionMeta: { requiredAssets: [requiredAssetMock] },
      });
      await act(async () => {
        await result.current.updateTransactionPayAmount('1.0000005');
      });

      const meta = applyMetadataCallback({
        txParams: { from: '0xabc' as Hex },
        requiredAssets: [requiredAssetMock],
      });

      // 1.0000005 floored to 6 decimals -> 1000000 -> 0xf4240
      expect(meta.requiredAssets?.[0].amount).toBe('0xf4240');
    });

    it('leaves required assets untouched when decimals are unknown', async () => {
      useTransactionPayRequiredTokensMock.mockReturnValue([]);

      const { result } = runHook({
        transactionMeta: { requiredAssets: [requiredAssetMock] },
      });
      await act(async () => {
        await result.current.updateTransactionPayAmount(AMOUNT_MOCK);
      });

      const meta = applyMetadataCallback({
        txParams: { from: '0xabc' as Hex },
        requiredAssets: [requiredAssetMock],
      });

      expect(meta.requiredAssets).toStrictEqual([requiredAssetMock]);
    });

    it('clears metadata derived from the previous amount', async () => {
      const { result } = runHook({
        transactionMeta: { requiredAssets: [requiredAssetMock] },
      });
      await act(async () => {
        await result.current.updateTransactionPayAmount(AMOUNT_MOCK);
      });

      const meta = applyMetadataCallback({
        txParams: { from: '0xabc' as Hex, gas: '0x1' as Hex },
        gasLimitNoBuffer: '0x2' as Hex,
        gasUsed: '0x3' as Hex,
        securityAlertResponse: { result_type: 'Benign', reason: '' },
        simulationData: { tokenBalanceChanges: [] },
        simulationFails: { debug: {}, reason: 'test' },
      } as Partial<TransactionMeta>);

      expect(meta.txParams?.gas).toBeUndefined();
      expect(meta.gasLimitNoBuffer).toBeUndefined();
      expect(meta.gasUsed).toBeUndefined();
      expect(meta.securityAlertResponse).toBeUndefined();
      expect(meta.simulationData).toBeUndefined();
      expect(meta.simulationFails).toBeUndefined();
    });

    it('clears stale revert data but keeps a receipt-backed revert', async () => {
      const { result } = runHook({
        transactionMeta: { requiredAssets: [requiredAssetMock] },
      });
      await act(async () => {
        await result.current.updateTransactionPayAmount(AMOUNT_MOCK);
      });

      const meta = applyMetadataCallback({
        txParams: { from: '0xabc' as Hex },
        revert: { gas: '0x1', simulation: {}, receipt: { status: '0x0' } },
      } as Partial<TransactionMeta>);

      expect(meta.revert).toStrictEqual({ receipt: { status: '0x0' } });
    });

    it('does not commit when there are no calls and the required asset is unchanged', async () => {
      getTransactionPayAmountCallsMock.mockResolvedValue([]);

      const { result } = runHook({
        transactionMeta: {
          requiredAssets: [{ ...requiredAssetMock, amount: '0x12c4b0' as Hex }],
        },
      });

      let didCommit;
      await act(async () => {
        didCommit =
          await result.current.updateTransactionPayAmount(AMOUNT_MOCK);
      });

      expect(didCommit).toBe(false);
      expect(updateTransactionMetadataMock).not.toHaveBeenCalled();
    });

    it('discards an update superseded by a newer amount', async () => {
      getTransactionPayAmountCallsMock.mockImplementation(
        async (_meta, amountHuman) => {
          if (amountHuman === AMOUNT_MOCK) {
            await new Promise((resolve) => setTimeout(resolve, 10));
          }
          return CALLS_MOCK;
        },
      );

      const { result } = runHook({
        transactionMeta: { requiredAssets: [requiredAssetMock] },
      });

      let staleResult;
      await act(async () => {
        const stale = result.current.updateTransactionPayAmount(AMOUNT_MOCK);
        await result.current.updateTransactionPayAmount('9.99');
        staleResult = await stale;
      });

      expect(staleResult).toBe(false);
      expect(updateTransactionMetadataMock).toHaveBeenCalledTimes(1);
    });

    it('propagates errors from the external module', async () => {
      getTransactionPayAmountCallsMock.mockRejectedValue(
        new Error('Money Account Deposit: rpc failure'),
      );

      const { result } = runHook();

      await expect(
        result.current.updateTransactionPayAmount(AMOUNT_MOCK),
      ).rejects.toThrow('Money Account Deposit: rpc failure');
      expect(updateTransactionMetadataMock).not.toHaveBeenCalled();
    });
  });
});
