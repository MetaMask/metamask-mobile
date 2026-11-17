import {
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import type { PredictAmount, PredictHex } from '../../types';
import {
  buildDepositTransferParams,
  createSimulatedTransferExecutor,
  createWalletTransferExecutor,
  randomTransferHash,
  type DepositTransfer,
  type WalletTransferExecutorDeps,
} from './depositTransferExecutor';

const FROM: PredictHex = '0x1111111111111111111111111111111111111111';
const USDC: PredictHex = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const RECIPIENT: PredictHex = '0x3b0b371ae3cb08f272b87319684f6518b3b313a0';
const HASH: PredictHex = `0x${'ab'.repeat(32)}`;
const EXPECTED_DATA =
  '0xa9059cbb' +
  '0000000000000000000000003b0b371ae3cb08f272b87319684f6518b3b313a0' +
  '00000000000000000000000000000000000000000000000000000000017d7840';

const TRANSFER: DepositTransfer = {
  from: FROM,
  chainId: 8453,
  tokenContract: USDC,
  recipient: RECIPIENT,
  amount: '25.00' as PredictAmount,
};

describe('buildDepositTransferParams', () => {
  it('locks the real transfer: USDC transfer(recipient, 25000000) with no native value', () => {
    expect(buildDepositTransferParams(TRANSFER)).toStrictEqual({
      from: FROM,
      to: USDC,
      data: EXPECTED_DATA,
      value: '0x0',
    });
  });
});

describe('createWalletTransferExecutor', () => {
  const meta = (overrides: Partial<TransactionMeta> = {}) =>
    ({
      id: 'tx-1',
      chainId: '0x2105',
      txParams: { from: FROM, to: USDC, data: EXPECTED_DATA },
      ...overrides,
    }) as TransactionMeta;

  const setup = (overrides: Partial<WalletTransferExecutorDeps> = {}) => {
    const deps: WalletTransferExecutorDeps = {
      findNetworkClientId: jest.fn(() => 'base-mainnet'),
      addTransaction: jest.fn(async () => ({
        result: Promise.resolve(HASH),
        transactionMeta: meta(),
      })),
      getTransaction: jest.fn(() => meta()),
      presentConfirmation: jest.fn(),
      ...overrides,
    };
    return { deps, executor: createWalletTransferExecutor(deps) };
  };

  it('adds the plain token transfer on the plan network as an internal transaction', async () => {
    const { deps, executor } = setup();

    await executor.send(TRANSFER);

    expect(deps.findNetworkClientId).toHaveBeenCalledWith('0x2105');
    expect(deps.addTransaction).toHaveBeenCalledWith(
      { from: FROM, to: USDC, data: EXPECTED_DATA, value: '0x0' },
      {
        networkClientId: 'base-mainnet',
        origin: 'metamask',
        isInternal: true,
        type: TransactionType.tokenMethodTransfer,
      },
    );
    expect(deps.addTransaction).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ type: TransactionType.predictDeposit }),
    );
  });

  it('opens the confirmation after adding the transaction', async () => {
    const order: string[] = [];
    const { executor } = setup({
      addTransaction: jest.fn(async () => {
        order.push('add');
        return { result: Promise.resolve(HASH), transactionMeta: meta() };
      }),
      presentConfirmation: jest.fn(() => order.push('present')),
    });

    await executor.send(TRANSFER);

    expect(order).toStrictEqual(['add', 'present']);
  });

  it('answers the hash with the call data the wallet submitted, read back by ID', async () => {
    const edited = meta({
      chainId: '0x2105',
      txParams: { from: FROM, to: USDC, data: '0xdeadbeef' },
    });
    const { deps, executor } = setup({
      getTransaction: jest.fn(() => edited),
    });

    await expect(executor.send(TRANSFER)).resolves.toStrictEqual({
      txHash: HASH,
      chainId: 8453,
      to: USDC,
      data: '0xdeadbeef',
    });
    expect(deps.getTransaction).toHaveBeenCalledWith('tx-1');
  });

  it('rejects when the user rejects the confirmation', async () => {
    const rejection = Object.assign(new Error('User rejected'), {
      code: 4001,
    });
    const { executor } = setup({
      addTransaction: jest.fn(async () => ({
        result: Promise.reject(rejection),
        transactionMeta: meta(),
      })),
    });

    await expect(executor.send(TRANSFER)).rejects.toBe(rejection);
  });

  it('adds nothing when the wallet has no network for the plan chain', async () => {
    const { deps, executor } = setup({
      findNetworkClientId: jest.fn(() => undefined),
    });

    await expect(executor.send(TRANSFER)).rejects.toThrow(
      'The deposit chain is not available in this wallet',
    );
    expect(deps.addTransaction).not.toHaveBeenCalled();
    expect(deps.presentConfirmation).not.toHaveBeenCalled();
  });
});

describe('createSimulatedTransferExecutor', () => {
  it('logs the exact transfer and answers a hash without touching the wallet', async () => {
    const log = jest.fn();
    const executor = createSimulatedTransferExecutor({
      log,
      makeHash: () => HASH,
    });

    await expect(executor.send(TRANSFER)).resolves.toStrictEqual({
      txHash: HASH,
      chainId: 8453,
      to: USDC,
      data: EXPECTED_DATA,
    });
    expect(executor.mode).toBe('simulated');
    expect(log).toHaveBeenCalledWith(
      'PredictNext: simulated deposit transfer, nothing was sent',
      {
        chainId: 8453,
        from: FROM,
        to: USDC,
        data: EXPECTED_DATA,
        recipient: RECIPIENT,
        amount: '25.00',
        baseUnits: '25000000',
      },
    );
  });

  it('answers a fresh random 32-byte hash by default', async () => {
    const executor = createSimulatedTransferExecutor({ log: jest.fn() });

    const first = await executor.send(TRANSFER);
    const second = await executor.send(TRANSFER);

    expect(first.txHash).toMatch(/^0x[0-9a-f]{64}$/u);
    expect(second.txHash).not.toBe(first.txHash);
  });
});

describe('randomTransferHash', () => {
  it('is 0x plus 64 hex characters', () => {
    expect(randomTransferHash()).toMatch(/^0x[0-9a-f]{64}$/u);
  });
});
