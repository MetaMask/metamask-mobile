import { TransactionType } from '@metamask/transaction-controller';

jest.mock('./core', () => {
  const actual = jest.requireActual('./core');

  return {
    ...actual,
    buildSignedSafeExecutionIfNeeded: jest.fn(),
    getRawTokenBalance: jest.fn(),
  };
});

jest.mock('../utils', () => ({
  encodeApprove: jest.fn(() => '0xapprove'),
  encodeErc20Transfer: jest.fn(() => '0xtransfer'),
  getAllowance: jest.fn(),
}));

jest.mock('../protocol/orderCodec', () => ({
  encodeWrap: jest.fn(() => '0xwrap'),
}));

import type { Hex } from '@metamask/utils';
import type { Signer } from '../../types';
import { POLYMARKET_V2_PROTOCOL } from '../protocol/definitions';
import { encodeWrap } from '../protocol/orderCodec';
import { OperationType } from '../safe/types';
import { encodeApprove, encodeErc20Transfer, getAllowance } from '../utils';
import {
  buildSignedSafeExecutionIfNeeded,
  getRawTokenBalance,
  type SignedSafeExecution,
} from './core';
import {
  buildLegacySafeMigrationSweepTransaction,
  planLegacySafeMigrationSweep,
} from './legacySafeMigration';

const legacySafeAddress = '0x1111111111111111111111111111111111111111';
const depositWalletAddress = '0x2222222222222222222222222222222222222222';
const signer: Signer = {
  address: '0x3333333333333333333333333333333333333333',
  signPersonalMessage: jest.fn(),
  signTypedMessage: jest.fn(),
};

const mockGetRawTokenBalance = jest.mocked(getRawTokenBalance);
const mockGetAllowance = jest.mocked(getAllowance);
const mockEncodeApprove = jest.mocked(encodeApprove);
const mockEncodeWrap = jest.mocked(encodeWrap);
const mockEncodeErc20Transfer = jest.mocked(encodeErc20Transfer);
const mockBuildSignedSafeExecutionIfNeeded = jest.mocked(
  buildSignedSafeExecutionIfNeeded,
);

function mockBalances({ usdce, pusd }: { usdce: bigint; pusd: bigint }): void {
  mockGetRawTokenBalance
    .mockResolvedValueOnce(usdce)
    .mockResolvedValueOnce(pusd);
}

describe('legacy Safe migration sweep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllowance.mockResolvedValue(0n);
  });

  it('returns no transactions when the legacy Safe has no sweepable balances', async () => {
    mockBalances({ usdce: 0n, pusd: 0n });

    const plan = await planLegacySafeMigrationSweep({
      legacySafeAddress,
      depositWalletAddress,
      protocol: POLYMARKET_V2_PROTOCOL,
    });

    expect(plan).toEqual({
      legacyUsdceBalance: 0n,
      legacyPusdBalance: 0n,
      transactions: [],
    });
    expect(mockGetAllowance).not.toHaveBeenCalled();
  });

  it('adds USDC.e approve then wrap when allowance is below balance', async () => {
    mockBalances({ usdce: 1_000_000n, pusd: 0n });
    mockGetAllowance.mockResolvedValue(0n);

    const plan = await planLegacySafeMigrationSweep({
      legacySafeAddress,
      depositWalletAddress,
      protocol: POLYMARKET_V2_PROTOCOL,
    });

    expect(mockGetAllowance).toHaveBeenCalledWith({
      tokenAddress: POLYMARKET_V2_PROTOCOL.collateral.legacyUsdceToken,
      owner: legacySafeAddress,
      spender: POLYMARKET_V2_PROTOCOL.collateral.onrampAddress,
    });
    expect(mockEncodeApprove).toHaveBeenCalledWith({
      spender: POLYMARKET_V2_PROTOCOL.collateral.onrampAddress,
      amount: expect.anything(),
    });
    expect(mockEncodeWrap).toHaveBeenCalledWith({
      asset: POLYMARKET_V2_PROTOCOL.collateral.legacyUsdceToken,
      to: depositWalletAddress,
      amount: 1_000_000n,
    });
    expect(plan.transactions).toEqual([
      {
        to: POLYMARKET_V2_PROTOCOL.collateral.legacyUsdceToken,
        data: '0xapprove',
        operation: OperationType.Call,
        value: '0',
      },
      {
        to: POLYMARKET_V2_PROTOCOL.collateral.onrampAddress,
        data: '0xwrap',
        operation: OperationType.Call,
        value: '0',
      },
    ]);
  });

  it('skips USDC.e approve when allowance covers the balance', async () => {
    mockBalances({ usdce: 1_000_000n, pusd: 0n });
    mockGetAllowance.mockResolvedValue(1_000_000n);

    const plan = await planLegacySafeMigrationSweep({
      legacySafeAddress,
      depositWalletAddress,
      protocol: POLYMARKET_V2_PROTOCOL,
    });

    expect(mockEncodeApprove).not.toHaveBeenCalled();
    expect(plan.transactions.map((transaction) => transaction.to)).toEqual([
      POLYMARKET_V2_PROTOCOL.collateral.onrampAddress,
    ]);
  });

  it('adds pUSD transfer to the deposit wallet', async () => {
    mockBalances({ usdce: 0n, pusd: 2_000_000n });

    const plan = await planLegacySafeMigrationSweep({
      legacySafeAddress,
      depositWalletAddress,
      protocol: POLYMARKET_V2_PROTOCOL,
    });

    expect(mockEncodeErc20Transfer).toHaveBeenCalledWith({
      to: depositWalletAddress,
      value: 2_000_000n,
    });
    expect(plan.transactions).toEqual([
      {
        to: POLYMARKET_V2_PROTOCOL.collateral.tradingToken,
        data: '0xtransfer',
        operation: OperationType.Call,
        value: '0',
      },
    ]);
  });

  it('orders both balances as USDC.e approve/wrap before pUSD transfer', async () => {
    mockBalances({ usdce: 1_000_000n, pusd: 2_000_000n });
    mockGetAllowance.mockResolvedValue(0n);

    const plan = await planLegacySafeMigrationSweep({
      legacySafeAddress,
      depositWalletAddress,
      protocol: POLYMARKET_V2_PROTOCOL,
    });

    expect(plan.transactions.map((transaction) => transaction.to)).toEqual([
      POLYMARKET_V2_PROTOCOL.collateral.legacyUsdceToken,
      POLYMARKET_V2_PROTOCOL.collateral.onrampAddress,
      POLYMARKET_V2_PROTOCOL.collateral.tradingToken,
    ]);
  });

  it('returns undefined from the signed sweep builder when there are no transactions', async () => {
    mockBalances({ usdce: 0n, pusd: 0n });
    mockBuildSignedSafeExecutionIfNeeded.mockResolvedValue(undefined);

    const result = await buildLegacySafeMigrationSweepTransaction({
      signer,
      legacySafeAddress,
      depositWalletAddress,
      protocol: POLYMARKET_V2_PROTOCOL,
    });

    expect(result).toBeUndefined();
    expect(mockBuildSignedSafeExecutionIfNeeded).toHaveBeenCalledWith({
      signer,
      safeAddress: legacySafeAddress,
      transactions: [],
      type: TransactionType.contractInteraction,
    });
  });

  it('signs a Safe execution for sweep transactions', async () => {
    mockBalances({ usdce: 0n, pusd: 2_000_000n });
    const signedSweep: SignedSafeExecution = {
      params: {
        to: legacySafeAddress as Hex,
        data: '0xsigned' as Hex,
      },
      type: TransactionType.contractInteraction,
    };
    mockBuildSignedSafeExecutionIfNeeded.mockResolvedValue(signedSweep);

    const result = await buildLegacySafeMigrationSweepTransaction({
      signer,
      legacySafeAddress,
      depositWalletAddress,
      protocol: POLYMARKET_V2_PROTOCOL,
    });

    expect(result).toBe(signedSweep);
    expect(mockBuildSignedSafeExecutionIfNeeded).toHaveBeenCalledWith({
      signer,
      safeAddress: legacySafeAddress,
      transactions: [
        {
          to: POLYMARKET_V2_PROTOCOL.collateral.tradingToken,
          data: '0xtransfer',
          operation: OperationType.Call,
          value: '0',
        },
      ],
      type: TransactionType.contractInteraction,
    });
  });
});
