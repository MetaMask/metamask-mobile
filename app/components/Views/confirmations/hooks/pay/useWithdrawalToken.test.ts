import { Hex } from '@metamask/utils';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useWithdrawalToken } from './useWithdrawalToken';
import { cloneDeep, merge } from 'lodash';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { RootState } from '../../../../../reducers';
import { otherControllersMock } from '../../__mocks__/controllers/other-controllers-mock';
import { TransactionType } from '@metamask/transaction-controller';
import Engine from '../../../../../core/Engine';
import { POLYGON_USDCE } from '../../constants/predict';
import { act } from '@testing-library/react-hooks';
import { withdrawalTokenStore } from './withdrawalTokenStore';

jest.mock('../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn(),
    },
    TransactionPayController: {
      updatePaymentToken: jest.fn(),
    },
  },
}));

jest.mock('../../../../../core/EngineService', () => ({
  flushState: jest.fn(),
}));

const STATE_MOCK = merge(
  simpleSendTransactionControllerMock,
  transactionApprovalControllerMock,
  otherControllersMock,
) as unknown as RootState;

const NETWORK_CLIENT_ID_MOCK = 'network-client-id-mock';

function runHook({ type }: { type?: TransactionType } = {}) {
  const mockState = cloneDeep(STATE_MOCK);

  if (type) {
    mockState.engine.backgroundState.TransactionController.transactions[0].type =
      type;
  }

  return renderHookWithProvider(useWithdrawalToken, {
    state: mockState,
  });
}

describe('useWithdrawalToken', () => {
  const findNetworkClientIdByChainIdMock = jest.mocked(
    Engine.context.NetworkController.findNetworkClientIdByChainId,
  );

  const updatePaymentTokenMock = jest.mocked(
    Engine.context.TransactionPayController.updatePaymentToken,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    findNetworkClientIdByChainIdMock.mockReturnValue(NETWORK_CLIENT_ID_MOCK);
    // Reset store to default state
    withdrawalTokenStore.reset();
  });

  describe('isWithdrawal', () => {
    it('returns false for non-withdrawal transaction types', () => {
      const { result } = runHook({ type: TransactionType.simpleSend });
      expect(result.current.isWithdrawal).toBe(false);
    });

    it('returns true for predictWithdraw transaction type', () => {
      const { result } = runHook({ type: TransactionType.predictWithdraw });
      expect(result.current.isWithdrawal).toBe(true);
    });
  });

  describe('canSelectWithdrawalToken', () => {
    const originalEnv = process.env.MM_PREDICT_WITHDRAWAL_TO_ANY_TOKEN;

    afterEach(() => {
      process.env.MM_PREDICT_WITHDRAWAL_TO_ANY_TOKEN = originalEnv;
    });

    it('returns false for non-withdrawal transactions regardless of feature flag', () => {
      process.env.MM_PREDICT_WITHDRAWAL_TO_ANY_TOKEN = 'true';
      // Need to re-import to pick up env change - but since it's evaluated at module load time,
      // we test the current behavior
      const { result } = runHook({ type: TransactionType.simpleSend });
      expect(result.current.canSelectWithdrawalToken).toBe(false);
    });
  });

  describe('withdrawalToken', () => {
    it('returns default Polygon USDC.E token for withdrawal transactions', () => {
      const { result } = runHook({ type: TransactionType.predictWithdraw });

      expect(result.current.withdrawalToken).toEqual(
        expect.objectContaining({
          address: POLYGON_USDCE.address,
          chainId: '0x89',
          symbol: POLYGON_USDCE.symbol,
        }),
      );
    });

    it('returns undefined for non-withdrawal transactions', () => {
      const { result } = runHook({ type: TransactionType.simpleSend });

      expect(result.current.withdrawalToken).toBeUndefined();
    });

    it('updates store when setWithdrawalToken is called', () => {
      const { result } = runHook({ type: TransactionType.predictWithdraw });

      act(() => {
        result.current.setWithdrawalToken({
          address: '0xNewTokenAddress' as Hex,
          chainId: '0x1' as Hex,
          symbol: 'ETH',
          decimals: 18,
          name: 'Ethereum',
        });
      });

      // Verify that the store was updated with the new token
      expect(withdrawalTokenStore.getToken()).toEqual({
        address: '0xNewTokenAddress',
        chainId: '0x1',
        symbol: 'ETH',
        decimals: 18,
        name: 'Ethereum',
      });
    });
  });

  describe('setWithdrawalToken', () => {
    it('calls TransactionPayController.updatePaymentToken with the new token', () => {
      const { result } = runHook({ type: TransactionType.predictWithdraw });

      act(() => {
        result.current.setWithdrawalToken({
          address: '0xNewTokenAddress' as Hex,
          chainId: '0x89' as Hex,
          symbol: 'USDC',
        });
      });

      expect(updatePaymentTokenMock).toHaveBeenCalledWith({
        transactionId: expect.any(String),
        tokenAddress: '0xNewTokenAddress',
        chainId: '0x89',
      });
    });

    it('does not call updatePaymentToken when network client not found', () => {
      findNetworkClientIdByChainIdMock.mockReturnValue(undefined as never);

      const { result } = runHook({ type: TransactionType.predictWithdraw });

      act(() => {
        result.current.setWithdrawalToken({
          address: '0xNewTokenAddress' as Hex,
          chainId: '0x999' as Hex,
          symbol: 'TEST',
        });
      });

      expect(updatePaymentTokenMock).not.toHaveBeenCalled();
    });
  });
});
