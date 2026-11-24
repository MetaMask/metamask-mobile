import { act } from '@testing-library/react-native';
import {
  TransactionStatus,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import Engine from '../../../../../../core/Engine';
import { renderHookWithProvider } from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { BASE_DEPOSIT_NETWORK } from '../../../config/depositEnvironment';
import {
  clearAllSessionDepositTransfers,
  recordSessionDepositTransfer,
} from '../../../funding';
import { makeDepositTransferTx } from '../../../funding/deposit/testUtils';
import { encodeUsdcTransfer } from '../../../funding/deposit/usdcTransfer';
import type {
  PredictAmount,
  PredictDepositOperation,
  PredictEntityId,
  PredictHex,
  PredictTimestamp,
  PredictVenueId,
} from '../../../types';
import { useDepositFlow } from './useDepositFlow';

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    TransactionController: {
      state: { transactions: [] },
      addTransaction: jest.fn(),
    },
    ApprovalController: {
      rejectRequest: jest.fn(),
    },
  },
  controllerMessenger: {
    call: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

jest.mock(
  '../../../../../Views/confirmations/hooks/useConfirmNavigation',
  () => ({
    useConfirmNavigation: () => ({
      navigateToConfirmation: jest.fn(),
    }),
  }),
);

jest.mock('./useUsdcBalance', () => ({
  findNetworkClientId: jest.fn(() => 'base-mainnet'),
}));

const VENUE_ID = 'kalshi' as PredictVenueId;
const FUNDING_WALLET: PredictHex = '0x0000000000000000000000000000000000000001';
const DEPOSIT_ADDRESS: PredictHex =
  '0x1111111111111111111111111111111111111111';
const USDC = BASE_DEPOSIT_NETWORK.usdc.address;
const TX_HASH: PredictHex = `0x${'ab'.repeat(32)}`;
const AMOUNT = '25.00' as PredictAmount;
const TRANSFER_DATA = encodeUsdcTransfer(DEPOSIT_ADDRESS, AMOUNT);

const makeDeposit = (
  overrides: Partial<PredictDepositOperation> = {},
): PredictDepositOperation => {
  const planExpiresAt = new Date(
    Date.now() + 10 * 60_000,
  ).toISOString() as PredictTimestamp;
  return {
    operationId: 'op-1' as PredictEntityId,
    status: 'awaiting_transfer',
    amount: AMOUNT,
    chainId: BASE_DEPOSIT_NETWORK.chainId,
    tokenContract: USDC,
    depositAddress: DEPOSIT_ADDRESS,
    planExpiresAt,
    txHash: null,
    createdAt: new Date().toISOString() as PredictTimestamp,
    next: {
      kind: 'wallet_transfer',
      chainId: BASE_DEPOSIT_NETWORK.chainId,
      tokenContract: USDC,
      amount: AMOUNT,
      depositAddress: DEPOSIT_ADDRESS,
      planExpiresAt,
    },
    ...overrides,
  };
};

const makeTx = (overrides: Partial<TransactionMeta> = {}): TransactionMeta =>
  makeDepositTransferTx(makeDeposit(), {
    txParams: {
      from: FUNDING_WALLET,
      to: USDC,
      data: TRANSFER_DATA,
      value: '0x0',
    },
    ...overrides,
  });

const TEST_STATE = {
  engine: {
    backgroundState,
  },
};

describe('useDepositFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearAllSessionDepositTransfers();
    Engine.context.TransactionController.state.transactions = [];
  });

  afterEach(() => {
    clearAllSessionDepositTransfers();
    Engine.context.TransactionController.state.transactions = [];
  });

  describe('hasSubmittedTransfer', () => {
    it('returns true for submitted, confirmed, committed pending, and session transfers, and false for unapproved or failed ones', () => {
      const deposit = makeDeposit();
      const { result } = renderHookWithProvider(
        () =>
          useDepositFlow({
            venueId: VENUE_ID,
            environment: undefined,
            fundingWallet: FUNDING_WALLET,
            addressPollIntervalMs: 1000,
          }),
        { state: TEST_STATE },
      );

      expect(result.current.hasSubmittedTransfer(deposit)).toBe(false);

      Engine.context.TransactionController.state.transactions = [
        makeTx({ status: TransactionStatus.unapproved, hash: undefined }),
      ];
      expect(result.current.hasSubmittedTransfer(deposit)).toBe(false);

      Engine.context.TransactionController.state.transactions = [
        makeTx({ status: TransactionStatus.signed, hash: undefined }),
      ];
      expect(result.current.hasSubmittedTransfer(deposit)).toBe(true);

      Engine.context.TransactionController.state.transactions = [
        makeTx({ status: TransactionStatus.submitted, hash: TX_HASH }),
      ];
      expect(result.current.hasSubmittedTransfer(deposit)).toBe(true);

      Engine.context.TransactionController.state.transactions = [
        makeTx({ status: TransactionStatus.failed, hash: TX_HASH }),
      ];
      expect(result.current.hasSubmittedTransfer(deposit)).toBe(false);

      Engine.context.TransactionController.state.transactions = [];
      recordSessionDepositTransfer(
        {
          venueId: VENUE_ID,
          operationId: deposit.operationId,
          from: FUNDING_WALLET,
          plan: {
            chainId: BASE_DEPOSIT_NETWORK.chainId,
            tokenContract: USDC,
            amount: AMOUNT,
            depositAddress: DEPOSIT_ADDRESS,
            planExpiresAt: deposit.planExpiresAt as PredictTimestamp,
          },
        },
        {
          txHash: TX_HASH,
          chainId: BASE_DEPOSIT_NETWORK.chainId,
          to: USDC,
          data: TRANSFER_DATA,
        },
      );
      expect(result.current.hasSubmittedTransfer(deposit)).toBe(true);
    });
  });

  describe('without a resolved environment', () => {
    it('refuses start and payOpenDeposit when no transfer was submitted yet', async () => {
      const deposit = makeDeposit();
      const { result } = renderHookWithProvider(
        () =>
          useDepositFlow({
            venueId: VENUE_ID,
            environment: undefined,
            fundingWallet: FUNDING_WALLET,
            addressPollIntervalMs: 1000,
          }),
        { state: TEST_STATE },
      );

      let startOutcome: unknown;
      let continueOutcome: unknown;
      await act(async () => {
        startOutcome = await result.current.start(AMOUNT);
        continueOutcome = await result.current.payOpenDeposit(deposit);
      });

      expect(startOutcome).toBeUndefined();
      expect(continueOutcome).toBeUndefined();
      expect(Engine.controllerMessenger.call).not.toHaveBeenCalled();
      expect(
        Engine.context.TransactionController.addTransaction,
      ).not.toHaveBeenCalled();
    });

    it('reconciles and reports an already-submitted transfer on payOpenDeposit without environment', async () => {
      const deposit = makeDeposit();
      const reportedDeposit = makeDeposit({ status: 'processing' });
      Engine.context.TransactionController.state.transactions = [
        makeTx({ status: TransactionStatus.submitted, hash: TX_HASH }),
      ];
      jest.mocked(Engine.controllerMessenger.call).mockImplementation((async (
        action: string,
      ) => {
        if (action === 'PredictFundingService:getDeposit') {
          return deposit;
        }
        if (action === 'PredictFundingService:reportDepositTransfer') {
          return reportedDeposit;
        }
        return undefined;
      }) as never);

      const { result } = renderHookWithProvider(
        () =>
          useDepositFlow({
            venueId: VENUE_ID,
            environment: undefined,
            fundingWallet: FUNDING_WALLET,
            addressPollIntervalMs: 1000,
          }),
        { state: TEST_STATE },
      );

      let outcome: unknown;
      await act(async () => {
        outcome = await result.current.payOpenDeposit(deposit);
      });

      expect(outcome).toStrictEqual({
        kind: 'submitted',
        deposit: reportedDeposit,
        reported: true,
      });
      expect(Engine.controllerMessenger.call).toHaveBeenCalledWith(
        'PredictFundingService:reportDepositTransfer',
        VENUE_ID,
        deposit.operationId,
        {
          txHash: TX_HASH,
          chainId: BASE_DEPOSIT_NETWORK.chainId,
        },
      );
      expect(Engine.controllerMessenger.call).not.toHaveBeenCalledWith(
        'PredictFundingService:cancelDeposit',
        expect.anything(),
        expect.anything(),
      );
      expect(
        Engine.context.TransactionController.addTransaction,
      ).not.toHaveBeenCalled();
    });
  });
});
