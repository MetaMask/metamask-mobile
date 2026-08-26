import {
  TransactionStatus as KeyringTransactionStatus,
  TransactionType as KeyringTransactionType,
  type Transaction as NonEvmTransaction,
} from '@metamask/keyring-api';
import type { V1TransactionByHashResponse } from '@metamask/core-backend';
import { ChainId, PooledStakingContract } from '@metamask/stake-sdk';
import { JsonRpcProvider } from '@ethersproject/providers';
import type { ActivityListItem } from '../types';
import {
  classifyKeyringStakingActivity,
  classifyPooledStakingActivity,
} from './staking-activity';

const MAINNET_POOL = '0x4fef9d741011476750a243ac70b9789a63dd47df';
const HOODI_POOL = '0xe96ac18cfe5a7af8fe1fe7bc37ff110d88bc67ff';
const DEPOSIT_METHOD_ID = '0xf9609f08';
const ENTER_EXIT_QUEUE_METHOD_ID = '0x8ceab9aa';
const CLAIM_EXITED_ASSETS_METHOD_ID = '0x8697d2c2';
const MULTICALL_METHOD_ID = '0xac9650d8';

const sender = '0x0000000000000000000000000000000000000001';
const fees = [{ type: 'base', amount: '21000', symbol: 'ETH', decimals: 18 }];
const nativeToken = {
  direction: 'out' as const,
  symbol: 'ETH',
  decimals: 18,
  amount: '1000000000000000000',
};

const buildApiTransaction = (
  overrides: Partial<
    Pick<V1TransactionByHashResponse, 'chainId' | 'to' | 'methodId'>
  > = {},
): Pick<V1TransactionByHashResponse, 'chainId' | 'to' | 'methodId'> => ({
  chainId: 1,
  to: MAINNET_POOL,
  methodId: DEPOSIT_METHOD_ID,
  ...overrides,
});

/** No fees by default: the mapper's `contractInteraction` branch omits them. */
const buildContractInteraction = (
  dataOverrides: {
    fees?: typeof fees;
    token?: typeof nativeToken | undefined;
  } = {},
): ActivityListItem => ({
  type: 'contractInteraction',
  chainId: 'eip155:1',
  status: 'success',
  timestamp: 1_760_000_000_000,
  hash: '0xhash',
  data: {
    from: sender,
    to: MAINNET_POOL,
    methodId: DEPOSIT_METHOD_ID,
    transactionCategory: 'CONTRACT_CALL',
    token: nativeToken,
    ...dataOverrides,
  },
});

const buildKeyringTransaction = (
  overrides: Partial<NonEvmTransaction> = {},
): NonEvmTransaction => ({
  id: 'tron-tx',
  chain: 'tron:728126428',
  account: '11111111-1111-1111-1111-111111111111',
  status: KeyringTransactionStatus.Confirmed,
  timestamp: 1_760_000_000,
  type: KeyringTransactionType.StakeDeposit,
  from: [
    {
      address: sender,
      asset: {
        fungible: true,
        type: 'tron:728126428/slip44:195',
        unit: 'TRX',
        amount: '100',
      },
    },
  ],
  to: [],
  fees: [],
  events: [],
  ...overrides,
});

const buildKeyringActivity = (): ActivityListItem => ({
  type: 'contractInteraction',
  chainId: 'tron:728126428',
  status: 'success',
  timestamp: 1_760_000_000_000,
  hash: 'tron-tx',
  data: { from: sender, to: '', fees: [] },
});

describe('classifyPooledStakingActivity', () => {
  it.each([
    [DEPOSIT_METHOD_ID, 'stake'],
    [ENTER_EXIT_QUEUE_METHOD_ID, 'unstake'],
    [CLAIM_EXITED_ASSETS_METHOD_ID, 'claim'],
    [MULTICALL_METHOD_ID, 'claim'],
  ])('classifies %s as %s', (methodId, expectedType) => {
    const result = classifyPooledStakingActivity(
      buildApiTransaction({ methodId }),
      buildContractInteraction(),
    );

    expect(result.type).toBe(expectedType);
  });

  it('keeps the sender and the moved token', () => {
    const result = classifyPooledStakingActivity(
      buildApiTransaction(),
      buildContractInteraction(),
    );

    expect(result).toMatchObject({
      type: 'stake',
      chainId: 'eip155:1',
      hash: '0xhash',
      status: 'success',
      data: { from: sender, token: nativeToken },
    });
  });

  it('keeps fees when the mapped activity has them', () => {
    const result = classifyPooledStakingActivity(
      buildApiTransaction(),
      buildContractInteraction({ fees }),
    );

    expect(result.data.fees).toStrictEqual(fees);
  });

  it.each(['pending', 'failed'] as const)('preserves %s status', (status) => {
    const result = classifyPooledStakingActivity(buildApiTransaction(), {
      ...buildContractInteraction(),
      status,
    });

    expect(result).toMatchObject({ type: 'stake', status });
  });

  it('drops the pool contract counterparty and the contract-interaction metadata', () => {
    const result = classifyPooledStakingActivity(
      buildApiTransaction(),
      buildContractInteraction(),
    );

    expect(result.data).not.toHaveProperty('to');
    expect(result.data).not.toHaveProperty('methodId');
    expect(result.data).not.toHaveProperty('transactionCategory');
  });

  it('classifies the Hoodi pool contract', () => {
    const result = classifyPooledStakingActivity(
      buildApiTransaction({ chainId: 560048, to: HOODI_POOL }),
      buildContractInteraction(),
    );

    expect(result.type).toBe('stake');
  });

  it('matches the pool address case-insensitively', () => {
    const result = classifyPooledStakingActivity(
      buildApiTransaction({ to: '0x4FEF9D741011476750A243aC70b9789a63dd47Df' }),
      buildContractInteraction(),
    );

    expect(result.type).toBe('stake');
  });

  // `enterExitQueue` transfers no ETH, so no amount can be shown.
  it('leaves an unstake without an amount rather than inventing one', () => {
    const result = classifyPooledStakingActivity(
      buildApiTransaction({ methodId: ENTER_EXIT_QUEUE_METHOD_ID }),
      buildContractInteraction({ token: undefined }),
    );

    expect(result.type).toBe('unstake');
    expect(result.data).toStrictEqual({ from: sender });
  });

  it('leaves an unrecognized selector on the pool contract untouched', () => {
    const activity = buildContractInteraction();

    const result = classifyPooledStakingActivity(
      buildApiTransaction({ methodId: '0xdeadbeef' }),
      activity,
    );

    expect(result).toBe(activity);
  });

  it('leaves a transaction with no selector untouched', () => {
    const activity = buildContractInteraction();

    const result = classifyPooledStakingActivity(
      buildApiTransaction({ methodId: undefined }),
      activity,
    );

    expect(result).toBe(activity);
  });

  it('leaves a staking selector sent to another contract untouched', () => {
    const activity = buildContractInteraction();

    const result = classifyPooledStakingActivity(
      buildApiTransaction({
        to: '0x1111111111111111111111111111111111111111',
      }),
      activity,
    );

    expect(result).toBe(activity);
  });

  it('leaves chains without a pool contract untouched', () => {
    const activity = buildContractInteraction();

    const result = classifyPooledStakingActivity(
      buildApiTransaction({ chainId: 59144 }),
      activity,
    );

    expect(result).toBe(activity);
  });

  it('re-classifies a deposit the API categorized without staking context', () => {
    const result = classifyPooledStakingActivity(buildApiTransaction(), {
      type: 'deposit',
      chainId: 'eip155:1',
      status: 'success',
      timestamp: 1_760_000_000_000,
      hash: '0xhash',
      data: { from: sender, token: nativeToken },
    });

    expect(result).toMatchObject({
      type: 'stake',
      data: { from: sender, token: nativeToken },
    });
  });

  // Observed on device: the pool's share transfer makes a claim look like a swap.
  it('recovers the claimed amount when the mapper produced a swap', () => {
    const result = classifyPooledStakingActivity(
      buildApiTransaction({ methodId: CLAIM_EXITED_ASSETS_METHOD_ID }),
      {
        type: 'swap',
        chainId: 'eip155:1',
        status: 'success',
        timestamp: 1_760_000_000_000,
        hash: '0xhash',
        data: {
          from: sender,
          sourceToken: { direction: 'out', symbol: 'osETH', amount: '1045' },
          destinationToken: {
            direction: 'in',
            symbol: 'ETH',
            decimals: 18,
            amount: '1045000000000000',
          },
        },
      },
    );

    expect(result).toMatchObject({
      type: 'claim',
      data: {
        token: {
          direction: 'in',
          symbol: 'ETH',
          amount: '1045000000000000',
        },
      },
    });
  });

  it('takes the outgoing leg when a stake was mapped as a swap', () => {
    const result = classifyPooledStakingActivity(buildApiTransaction(), {
      type: 'swap',
      chainId: 'eip155:1',
      status: 'success',
      timestamp: 1_760_000_000_000,
      hash: '0xhash',
      data: {
        from: sender,
        sourceToken: nativeToken,
        destinationToken: { direction: 'in', symbol: 'osETH', amount: '1045' },
      },
    });

    expect(result).toMatchObject({
      type: 'stake',
      data: { token: nativeToken },
    });
  });

  it('keeps an API-categorized claim as a claim without losing its token', () => {
    const claimedToken = { ...nativeToken, direction: 'in' as const };

    const result = classifyPooledStakingActivity(
      buildApiTransaction({ methodId: CLAIM_EXITED_ASSETS_METHOD_ID }),
      {
        type: 'claim',
        chainId: 'eip155:1',
        status: 'success',
        timestamp: 1_760_000_000_000,
        hash: '0xhash',
        data: { from: sender, token: claimedToken },
      },
    );

    expect(result).toMatchObject({
      type: 'claim',
      data: { from: sender, token: claimedToken },
    });
  });
});

// `contractMap` is not re-exported, so the copied constants are pinned against
// the public contract class instead.
describe('pooled staking constants match @metamask/stake-sdk', () => {
  const buildContract = (chainId: ChainId) =>
    new PooledStakingContract(
      chainId,
      new JsonRpcProvider('http://localhost:8545'),
    );

  it.each([
    [ChainId.ETHEREUM, MAINNET_POOL],
    [ChainId.HOODI, HOODI_POOL],
  ])('resolves the pool address for chain %s', (chainId, expectedAddress) => {
    expect(buildContract(chainId).contract.address.toLowerCase()).toBe(
      expectedAddress,
    );
  });

  it.each([
    ['deposit', DEPOSIT_METHOD_ID],
    ['enterExitQueue', ENTER_EXIT_QUEUE_METHOD_ID],
    ['claimExitedAssets', CLAIM_EXITED_ASSETS_METHOD_ID],
    ['multicall', MULTICALL_METHOD_ID],
  ])('resolves the %s selector', (functionName, expectedMethodId) => {
    expect(
      buildContract(ChainId.ETHEREUM).contract.interface.getSighash(
        functionName,
      ),
    ).toBe(expectedMethodId);
  });
});

describe('classifyKeyringStakingActivity', () => {
  it('classifies stake:deposit with the outgoing token', () => {
    const result = classifyKeyringStakingActivity(
      buildKeyringTransaction(),
      buildKeyringActivity(),
    );

    expect(result).toMatchObject({
      type: 'stake',
      chainId: 'tron:728126428',
      data: {
        token: {
          amount: '100',
          symbol: 'TRX',
          assetId: 'tron:728126428/slip44:195',
          direction: 'out',
        },
      },
    });
  });

  it('classifies stake:withdraw with the incoming token', () => {
    const result = classifyKeyringStakingActivity(
      buildKeyringTransaction({
        type: KeyringTransactionType.StakeWithdraw,
        from: [],
        to: [
          {
            address: sender,
            asset: {
              fungible: true,
              type: 'tron:728126428/slip44:195',
              unit: 'TRX',
              amount: '100',
            },
          },
        ],
      }),
      buildKeyringActivity(),
    );

    expect(result).toMatchObject({
      type: 'unstake',
      data: { token: { amount: '100', symbol: 'TRX', direction: 'in' } },
    });
  });

  it('classifies a stake without movements as label-only', () => {
    const result = classifyKeyringStakingActivity(
      buildKeyringTransaction({ from: [{ address: sender, asset: null }] }),
      buildKeyringActivity(),
    );

    expect(result.type).toBe('stake');
    expect(result.data).not.toHaveProperty('token');
  });

  it('leaves non-staking keyring types untouched', () => {
    const activity = buildKeyringActivity();

    const result = classifyKeyringStakingActivity(
      buildKeyringTransaction({ type: KeyringTransactionType.Send }),
      activity,
    );

    expect(result).toBe(activity);
  });
});
