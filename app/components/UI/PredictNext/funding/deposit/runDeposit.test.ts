import { TransactionStatus } from '@metamask/transaction-controller';
import { BASE_DEPOSIT_NETWORK } from '../../config/depositEnvironment';
import { PredictError, PredictErrorCode } from '../../errors';
import type {
  PredictAmount,
  PredictDepositOperation,
  PredictEntityId,
  PredictHex,
  PredictTimestamp,
} from '../../types';
import type { DepositTransferExecutor } from './depositTransferExecutor';
import {
  canReuseClientOperationId,
  payDeposit,
  startDeposit,
  type DepositFunding,
  type DepositOutcome,
  type DepositWorkflowDeps,
} from './runDeposit';
import { encodeUsdcTransfer } from './usdcTransfer';

const NOW = Date.parse('2026-11-13T12:00:00.000Z');
const OPERATION_ID = '019a7c3e-5c1a-7d2e-9a40-3f1c2b0d4e5f';
const FROM: PredictHex = '0x1111111111111111111111111111111111111111';
const USDC = BASE_DEPOSIT_NETWORK.usdc.address;
const DEPOSIT_ADDRESS: PredictHex =
  '0x3b0b371ae3cb08f272b87319684f6518b3b313a0';
const HASH: PredictHex = `0x${'ab'.repeat(32)}`;
const AMOUNT = '25.50' as PredictAmount;
const CLIENT_OPERATION_ID = '6f1c7a52-8f3e-4d8b-9c1e-2a4b5c6d7e8f';

const awaitingTransfer = (
  overrides: { amount?: string; planExpiresAt?: string } = {},
): PredictDepositOperation => {
  const amount = (overrides.amount ?? '25.50') as PredictAmount;
  const planExpiresAt = (overrides.planExpiresAt ??
    '2026-11-13T12:15:00.000Z') as PredictTimestamp;
  return {
    operationId: OPERATION_ID as PredictEntityId,
    status: 'awaiting_transfer',
    amount,
    chainId: 8453,
    tokenContract: USDC,
    depositAddress: DEPOSIT_ADDRESS,
    planExpiresAt,
    txHash: null,
    createdAt: '2026-11-13T12:00:00.000Z' as PredictTimestamp,
    next: {
      kind: 'wallet_transfer',
      chainId: 8453,
      tokenContract: USDC,
      amount,
      depositAddress: DEPOSIT_ADDRESS,
      planExpiresAt,
    },
  };
};

const requestingAddress = (): PredictDepositOperation => ({
  ...awaitingTransfer(),
  status: 'processing',
  depositAddress: null,
  planExpiresAt: null,
  next: { kind: 'wait' },
});

const transferReported = (): PredictDepositOperation => ({
  ...awaitingTransfer(),
  status: 'processing',
  txHash: HASH,
  next: { kind: 'wait' },
});

const paying = (data = encodeUsdcTransfer(DEPOSIT_ADDRESS, AMOUNT)) => ({
  txHash: HASH,
  chainId: 8453,
  to: USDC,
  data,
});

const setup = ({
  funding: fundingOverrides = {},
  send = jest.fn(async () => paying()),
}: {
  funding?: Partial<DepositFunding>;
  send?: DepositTransferExecutor['send'];
} = {}) => {
  const funding: jest.Mocked<DepositFunding> = {
    prepareDeposit: jest.fn(async () => awaitingTransfer()),
    getDeposit: jest.fn(async () => awaitingTransfer()),
    listOpenDeposits: jest.fn(async () => []),
    reportDepositTransfer: jest.fn(async () => transferReported()),
    cancelDeposit: jest.fn(async () => ({
      ...awaitingTransfer(),
      status: 'cancelled' as const,
      next: null,
    })),
    ...fundingOverrides,
  } as jest.Mocked<DepositFunding>;
  const executor = { mode: 'wallet' as const, send: jest.fn(send) };
  const deps: DepositWorkflowDeps = {
    funding,
    executor,
    network: BASE_DEPOSIT_NETWORK,
    from: FROM,
    walletAddresses: [FROM],
    now: () => NOW,
    wait: jest.fn(async () => undefined),
    addressPoll: { intervalMs: 2000, attempts: 3 },
    isUserRejection: (error) => (error as { code?: number })?.code === 4001,
    logError: jest.fn(),
  };
  return { deps, funding, executor };
};

const start = (deps: DepositWorkflowDeps) =>
  startDeposit(deps, {
    amount: AMOUNT,
    clientOperationId: CLIENT_OPERATION_ID,
  });

describe('startDeposit', () => {
  it('prepares, sends exactly the plan, and reports the hash on the plan chain', async () => {
    const { deps, funding, executor } = setup();

    const outcome = await start(deps);

    expect(funding.prepareDeposit).toHaveBeenCalledWith({
      amount: AMOUNT,
      clientOperationId: CLIENT_OPERATION_ID,
    });
    expect(executor.send).toHaveBeenCalledWith({
      from: FROM,
      chainId: 8453,
      tokenContract: USDC,
      recipient: DEPOSIT_ADDRESS,
      amount: '25.50',
    });
    expect(funding.reportDepositTransfer).toHaveBeenCalledWith(OPERATION_ID, {
      txHash: HASH,
      chainId: 8453,
    });
    expect(funding.cancelDeposit).not.toHaveBeenCalled();
    expect(outcome).toStrictEqual({
      kind: 'submitted',
      deposit: transferReported(),
      reported: true,
    });
  });

  it('opens the existing open deposit on deposit_in_progress and sends nothing', async () => {
    const open = awaitingTransfer({ amount: '10.00' });
    const { deps, funding, executor } = setup({
      funding: {
        prepareDeposit: jest.fn(async () => {
          throw PredictError.from(PredictErrorCode.DEPOSIT_IN_PROGRESS);
        }),
        listOpenDeposits: jest.fn(async () => [open]),
      },
    });

    await expect(start(deps)).resolves.toStrictEqual({
      kind: 'in_progress',
      deposit: open,
    });
    expect(executor.send).not.toHaveBeenCalled();
    expect(funding.cancelDeposit).not.toHaveBeenCalled();
  });

  it('opens the deposit the refusal names, not the oldest open one', async () => {
    const reviewed = {
      ...awaitingTransfer({ amount: '5.00' }),
      operationId: '019a7c3e-5c1a-7d2e-9a40-3f1c2b0d4e60' as PredictEntityId,
      status: 'under_review' as const,
      planExpiresAt: null,
      next: {
        kind: 'review' as const,
        supportReference: '019a7c3e-5c1a-7d2e-9a40-3f1c2b0d4e60',
      },
    };
    const blocked = awaitingTransfer({ amount: '2.00' });
    const { deps, funding, executor } = setup({
      funding: {
        prepareDeposit: jest.fn(async () => {
          throw PredictError.from(PredictErrorCode.DEPOSIT_IN_PROGRESS, {
            metadata: { depositOperationId: blocked.operationId },
          });
        }),
        listOpenDeposits: jest.fn(async () => [reviewed, blocked]),
      },
    });

    await expect(start(deps)).resolves.toStrictEqual({
      kind: 'in_progress',
      deposit: blocked,
    });
    expect(funding.listOpenDeposits).toHaveBeenCalled();
    expect(executor.send).not.toHaveBeenCalled();
  });

  it('answers in_progress without a deposit when the open list cannot be read', async () => {
    const { deps } = setup({
      funding: {
        prepareDeposit: jest.fn(async () => {
          throw PredictError.from(PredictErrorCode.DEPOSIT_IN_PROGRESS);
        }),
        listOpenDeposits: jest.fn(async () => {
          throw new Error('offline');
        }),
      },
    });

    await expect(start(deps)).resolves.toStrictEqual({
      kind: 'in_progress',
      deposit: null,
    });
  });

  it('answers a failed prepare with its product error and sends nothing', async () => {
    const refused = PredictError.from(PredictErrorCode.DEPOSIT_AMOUNT_REJECTED);
    const { deps, executor } = setup({
      funding: {
        prepareDeposit: jest.fn(async () => {
          throw refused;
        }),
      },
    });

    await expect(start(deps)).resolves.toStrictEqual({
      kind: 'failed',
      stage: 'prepare',
      error: refused,
    });
    expect(executor.send).not.toHaveBeenCalled();
  });

  it('reads the deposit again while the venue prepares its address', async () => {
    const { deps, funding, executor } = setup({
      funding: {
        prepareDeposit: jest.fn(async () => requestingAddress()),
        getDeposit: jest
          .fn()
          .mockResolvedValueOnce(requestingAddress())
          .mockResolvedValueOnce(awaitingTransfer()),
      },
    });

    const outcome = await start(deps);

    expect(deps.wait).toHaveBeenCalledTimes(2);
    expect(deps.wait).toHaveBeenCalledWith(2000);
    expect(funding.getDeposit).toHaveBeenCalledWith(OPERATION_ID);
    expect(executor.send).toHaveBeenCalledTimes(1);
    expect(outcome.kind).toBe('submitted');
  });

  it('stops waiting after the last attempt and shows the deposit as in progress', async () => {
    const { deps, funding, executor } = setup({
      funding: {
        prepareDeposit: jest.fn(async () => requestingAddress()),
        getDeposit: jest.fn(async () => requestingAddress()),
      },
    });

    await expect(start(deps)).resolves.toStrictEqual({
      kind: 'in_progress',
      deposit: requestingAddress(),
    });
    expect(funding.getDeposit).toHaveBeenCalledTimes(3);
    expect(executor.send).not.toHaveBeenCalled();
    expect(funding.cancelDeposit).not.toHaveBeenCalled();
  });

  it('fails a deposit the venue refused while waiting for its address', async () => {
    const { deps, executor } = setup({
      funding: {
        prepareDeposit: jest.fn(async () => requestingAddress()),
        getDeposit: jest.fn(async () => ({
          ...requestingAddress(),
          status: 'failed' as const,
          next: null,
        })),
      },
    });

    const outcome = await start(deps);

    expect(outcome).toMatchObject({ kind: 'failed', stage: 'prepare' });
    expect((outcome as { error: PredictError }).error.code).toBe(
      PredictErrorCode.DEPOSIT_FAILED,
    );
    expect(executor.send).not.toHaveBeenCalled();
  });
});

describe('payDeposit', () => {
  it('refuses a plan for another amount, cancels it and sends nothing', async () => {
    const { deps, funding, executor } = setup();

    const outcome = await payDeposit(
      deps,
      awaitingTransfer({ amount: '30.00' }),
      AMOUNT,
    );

    expect(outcome).toStrictEqual({ kind: 'plan_mismatch', reason: 'amount' });
    expect(executor.send).not.toHaveBeenCalled();
    expect(funding.cancelDeposit).toHaveBeenCalledWith(OPERATION_ID);
    expect(funding.reportDepositTransfer).not.toHaveBeenCalled();
  });

  it('refuses a plan with two minutes or less left', async () => {
    const { deps, funding, executor } = setup();

    const outcome = await payDeposit(
      deps,
      awaitingTransfer({ planExpiresAt: '2026-11-13T12:01:30.000Z' }),
      AMOUNT,
    );

    expect(outcome).toStrictEqual({ kind: 'plan_mismatch', reason: 'expiry' });
    expect(executor.send).not.toHaveBeenCalled();
    expect(funding.cancelDeposit).toHaveBeenCalledWith(OPERATION_ID);
  });

  it('still answers plan_mismatch when the cancel fails', async () => {
    const { deps } = setup({
      funding: {
        cancelDeposit: jest.fn(async () => {
          throw new Error('offline');
        }),
      },
    });

    await expect(
      payDeposit(deps, awaitingTransfer({ amount: '30.00' }), AMOUNT),
    ).resolves.toStrictEqual({ kind: 'plan_mismatch', reason: 'amount' });
    expect(deps.logError).toHaveBeenCalled();
  });

  it('cancels the deposit when the user rejects the transfer', async () => {
    const { deps, funding } = setup({
      send: jest.fn(async () => {
        throw Object.assign(new Error('User rejected'), { code: 4001 });
      }),
    });

    await expect(
      payDeposit(deps, awaitingTransfer(), AMOUNT),
    ).resolves.toStrictEqual({ kind: 'rejected' });
    expect(funding.cancelDeposit).toHaveBeenCalledWith(OPERATION_ID);
    expect(funding.reportDepositTransfer).not.toHaveBeenCalled();
  });

  it('cancels the deposit when the transfer fails', async () => {
    const { deps, funding } = setup({
      send: jest.fn(async () => {
        throw new Error('nonce too low');
      }),
    });

    const outcome = await payDeposit(deps, awaitingTransfer(), AMOUNT);

    expect(outcome).toMatchObject({ kind: 'failed', stage: 'transfer' });
    expect((outcome as { error: PredictError }).error.code).toBe(
      PredictErrorCode.DEPOSIT_FAILED,
    );
    expect(funding.cancelDeposit).toHaveBeenCalledWith(OPERATION_ID);
  });

  it.each([
    [
      'another recipient',
      paying(
        encodeUsdcTransfer(
          '0x2222222222222222222222222222222222222222',
          AMOUNT,
        ),
      ),
    ],
    [
      'another amount',
      paying(encodeUsdcTransfer(DEPOSIT_ADDRESS, '25.49' as PredictAmount)),
    ],
    ['another token', { ...paying(), to: DEPOSIT_ADDRESS }],
    ['another chain', { ...paying(), chainId: 1 }],
    ['other call data', { ...paying(), data: '0x' }],
    ['no call data', { ...paying(), data: undefined }],
  ])(
    'never reports a submitted transfer that pays %s',
    async (_label, submitted) => {
      const { deps, funding } = setup({
        send: jest.fn(async () => submitted),
      });

      const outcome = await payDeposit(deps, awaitingTransfer(), AMOUNT);

      expect(outcome).toMatchObject({ kind: 'failed', stage: 'transfer' });
      expect((outcome as { error: PredictError }).error.code).toBe(
        PredictErrorCode.DEPOSIT_TRANSFER_MISMATCH,
      );
      expect(funding.reportDepositTransfer).not.toHaveBeenCalled();
      expect(funding.cancelDeposit).toHaveBeenCalledWith(OPERATION_ID);
    },
  );

  it('keeps the deposit open when the report is lost after the transfer went out', async () => {
    const { deps, funding } = setup({
      funding: {
        reportDepositTransfer: jest.fn(async () => {
          throw PredictError.from(PredictErrorCode.NETWORK_ERROR);
        }),
      },
    });
    const deposit = awaitingTransfer();

    await expect(payDeposit(deps, deposit, AMOUNT)).resolves.toStrictEqual({
      kind: 'submitted',
      deposit,
      reported: false,
    });
    expect(funding.cancelDeposit).not.toHaveBeenCalled();
  });

  it('answers the backend refusing the reported transfer without cancelling', async () => {
    const refused = PredictError.from(
      PredictErrorCode.DEPOSIT_TRANSFER_MISMATCH,
    );
    const { deps, funding } = setup({
      funding: {
        reportDepositTransfer: jest.fn(async () => {
          throw refused;
        }),
      },
    });

    await expect(
      payDeposit(deps, awaitingTransfer(), AMOUNT),
    ).resolves.toStrictEqual({
      kind: 'failed',
      stage: 'report',
      error: refused,
    });
    expect(funding.cancelDeposit).not.toHaveBeenCalled();
  });

  it('reconciles a lost report on retry without sending a second wallet transfer', async () => {
    const deposit = awaitingTransfer();
    const reportDepositTransfer = jest
      .fn()
      .mockRejectedValueOnce(PredictError.from(PredictErrorCode.NETWORK_ERROR))
      .mockResolvedValueOnce(transferReported());
    const { deps, executor } = setup({
      funding: {
        prepareDeposit: jest.fn(async () => deposit),
        reportDepositTransfer,
      },
    });

    const firstOutcome = await start(deps);
    const secondOutcome = await payDeposit(deps, deposit, AMOUNT);

    expect(firstOutcome).toStrictEqual({
      kind: 'submitted',
      deposit,
      reported: false,
    });
    expect(secondOutcome).toStrictEqual({
      kind: 'submitted',
      deposit: transferReported(),
      reported: true,
    });
    expect(executor.send).toHaveBeenCalledTimes(1);
    expect(reportDepositTransfer).toHaveBeenCalledTimes(2);
    expect(reportDepositTransfer).toHaveBeenLastCalledWith(OPERATION_ID, {
      txHash: HASH,
      chainId: 8453,
    });
  });

  it('reports an existing submitted transfer recovered from the wallet even near expiry without sending again', async () => {
    const deposit = awaitingTransfer({
      planExpiresAt: '2026-11-13T12:01:00.000Z',
    });
    const { deps, funding, executor } = setup();
    deps.findExistingTransfer = jest.fn(() => ({
      kind: 'submitted',
      transfer: paying(),
    }));

    const outcome = await payDeposit(deps, deposit, AMOUNT);

    expect(outcome).toStrictEqual({
      kind: 'submitted',
      deposit: transferReported(),
      reported: true,
    });
    expect(executor.send).not.toHaveBeenCalled();
    expect(funding.cancelDeposit).not.toHaveBeenCalled();
    expect(funding.reportDepositTransfer).toHaveBeenCalledWith(OPERATION_ID, {
      txHash: HASH,
      chainId: 8453,
    });
  });

  it('waits for an existing pending transfer instead of sending a second one', async () => {
    const deposit = awaitingTransfer();
    const { deps, funding, executor } = setup();
    const wait = jest.fn(async () => paying());
    deps.findExistingTransfer = jest.fn(() => ({
      kind: 'pending',
      status: TransactionStatus.signed,
      wait,
    }));

    const outcome = await payDeposit(deps, deposit, AMOUNT);

    expect(outcome).toStrictEqual({
      kind: 'submitted',
      deposit: transferReported(),
      reported: true,
    });
    expect(wait).toHaveBeenCalledTimes(1);
    expect(executor.send).not.toHaveBeenCalled();
    expect(funding.reportDepositTransfer).toHaveBeenCalledWith(OPERATION_ID, {
      txHash: HASH,
      chainId: 8453,
    });
  });

  it('cancels the deposit when an existing pending transfer is rejected by the user', async () => {
    const deposit = awaitingTransfer();
    const { deps, funding, executor } = setup();
    deps.findExistingTransfer = jest.fn(() => ({
      kind: 'pending',
      status: TransactionStatus.unapproved,
      wait: jest.fn(async () => {
        throw Object.assign(new Error('User rejected'), { code: 4001 });
      }),
    }));

    await expect(payDeposit(deps, deposit, AMOUNT)).resolves.toStrictEqual({
      kind: 'rejected',
    });
    expect(executor.send).not.toHaveBeenCalled();
    expect(funding.cancelDeposit).toHaveBeenCalledWith(OPERATION_ID);
    expect(funding.reportDepositTransfer).not.toHaveBeenCalled();
  });

  it('refuses an unapproved pending transfer when the plan has two minutes or less left', async () => {
    const deposit = awaitingTransfer({
      planExpiresAt: '2026-11-13T12:01:30.000Z',
    });
    const { deps, funding, executor } = setup();
    const wait = jest.fn(async () => paying());
    deps.findExistingTransfer = jest.fn(() => ({
      kind: 'pending',
      status: TransactionStatus.unapproved,
      wait,
    }));

    await expect(payDeposit(deps, deposit, AMOUNT)).resolves.toStrictEqual({
      kind: 'plan_mismatch',
      reason: 'expiry',
    });
    expect(wait).not.toHaveBeenCalled();
    expect(executor.send).not.toHaveBeenCalled();
    expect(funding.cancelDeposit).toHaveBeenCalledWith(OPERATION_ID);
  });
});

describe('canReuseClientOperationId', () => {
  const failedPrepare = (code: PredictErrorCode): DepositOutcome => ({
    kind: 'failed',
    stage: 'prepare',
    error: PredictError.from(code),
  });

  it.each([
    PredictErrorCode.NETWORK_ERROR,
    PredictErrorCode.UNKNOWN,
    PredictErrorCode.VENUE_UNAVAILABLE,
  ])('reuses the ID after a prepare that failed with %s', (code) => {
    expect(canReuseClientOperationId(failedPrepare(code))).toBe(true);
  });

  it.each([
    PredictErrorCode.DEPOSIT_FAILED,
    PredictErrorCode.DEPOSIT_MISMATCH,
    PredictErrorCode.DEPOSIT_AMOUNT_REJECTED,
  ])('makes a new ID after a prepare refused with %s', (code) => {
    expect(canReuseClientOperationId(failedPrepare(code))).toBe(false);
  });

  it.each<DepositOutcome>([
    { kind: 'rejected' },
    { kind: 'plan_mismatch', reason: 'amount' },
    { kind: 'in_progress', deposit: null },
    {
      kind: 'failed',
      stage: 'transfer',
      error: PredictError.from(PredictErrorCode.DEPOSIT_FAILED),
    },
  ])('makes a new ID after a $kind outcome', (outcome) => {
    expect(canReuseClientOperationId(outcome)).toBe(false);
  });
});
