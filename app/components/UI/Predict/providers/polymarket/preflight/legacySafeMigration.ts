import { TransactionType } from '@metamask/transaction-controller';
import { ethers } from 'ethers';
import type { Signer } from '../../types';
import {
  POLYMARKET_V2_PROTOCOL,
  type PolymarketProtocolDefinition,
} from '../protocol/definitions';
import { encodeWrap } from '../protocol/orderCodec';
import { OperationType, type SafeTransaction } from '../safe/types';
import { encodeApprove, encodeErc20Transfer, getAllowance } from '../utils';
import {
  buildSignedSafeExecutionIfNeeded,
  getRawTokenBalance,
  type SignedSafeExecution,
} from './core';

export interface LegacySafeMigrationSweepPlan {
  legacyUsdceBalance: bigint;
  legacyPusdBalance: bigint;
  transactions: SafeTransaction[];
}

export async function planLegacySafeMigrationSweep({
  legacySafeAddress,
  depositWalletAddress,
  protocol = POLYMARKET_V2_PROTOCOL,
}: {
  legacySafeAddress: string;
  depositWalletAddress: string;
  protocol?: PolymarketProtocolDefinition;
}): Promise<LegacySafeMigrationSweepPlan> {
  const [legacyUsdceBalance, legacyPusdBalance] = await Promise.all([
    getRawTokenBalance({
      address: legacySafeAddress,
      tokenAddress: protocol.collateral.legacyUsdceToken,
    }),
    getRawTokenBalance({
      address: legacySafeAddress,
      tokenAddress: protocol.collateral.tradingToken,
    }),
  ]);
  const transactions: SafeTransaction[] = [];

  if (legacyUsdceBalance > 0n) {
    const allowance = await getAllowance({
      tokenAddress: protocol.collateral.legacyUsdceToken,
      owner: legacySafeAddress,
      spender: protocol.collateral.onrampAddress,
    });

    if (allowance < legacyUsdceBalance) {
      transactions.push({
        to: protocol.collateral.legacyUsdceToken,
        data: encodeApprove({
          spender: protocol.collateral.onrampAddress,
          amount: ethers.constants.MaxUint256.toBigInt(),
        }),
        operation: OperationType.Call,
        value: '0',
      });
    }

    transactions.push({
      to: protocol.collateral.onrampAddress,
      data: encodeWrap({
        asset: protocol.collateral.legacyUsdceToken,
        to: depositWalletAddress,
        amount: legacyUsdceBalance,
      }),
      operation: OperationType.Call,
      value: '0',
    });
  }

  if (legacyPusdBalance > 0n) {
    transactions.push({
      to: protocol.collateral.tradingToken,
      data: encodeErc20Transfer({
        to: depositWalletAddress,
        value: legacyPusdBalance,
      }),
      operation: OperationType.Call,
      value: '0',
    });
  }

  return {
    legacyUsdceBalance,
    legacyPusdBalance,
    transactions,
  };
}

export async function buildLegacySafeMigrationSweepTransaction({
  signer,
  legacySafeAddress,
  depositWalletAddress,
  protocol = POLYMARKET_V2_PROTOCOL,
}: {
  signer: Signer;
  legacySafeAddress: string;
  depositWalletAddress: string;
  protocol?: PolymarketProtocolDefinition;
}): Promise<SignedSafeExecution | undefined> {
  const plan = await planLegacySafeMigrationSweep({
    legacySafeAddress,
    depositWalletAddress,
    protocol,
  });

  return buildSignedSafeExecutionIfNeeded({
    signer,
    safeAddress: legacySafeAddress,
    transactions: plan.transactions,
    type: TransactionType.contractInteraction,
  });
}
