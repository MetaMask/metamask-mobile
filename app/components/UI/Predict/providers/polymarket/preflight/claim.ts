import { TransactionType } from '@metamask/transaction-controller';
import { parseUnits } from 'ethers/lib/utils';
import type { PredictPosition } from '../../../types';
import type { Signer } from '../../types';
import {
  HASH_ZERO_BYTES32,
  MIN_PUSD_BALANCE_FOR_CLAIM_GAS,
} from '../constants';
import {
  POLYMARKET_POSITIONS_PROTOCOL,
  POLYMARKET_V2_PROTOCOL,
  type PolymarketProtocolDefinition,
} from '../protocol/definitions';
import { toDepositWalletCalls, type DepositWalletCall } from '../depositWallet';
import { OperationType, type SafeTransaction } from '../safe/types';
import {
  encodeErc20Transfer,
  encodeRedeemPositions,
  encodeRouterRedeem,
} from '../utils';
import {
  buildSignedSafeExecution,
  compileAllowanceMaintenanceTransactions,
  getRawTokenBalance,
} from './core';
import { compileRequirementTransactions } from './compileRequirementTransactions';
import { inspectMissingRequirements } from './inspectMissingRequirements';
import {
  filterDepositWalletUnsupportedRequirements,
  getActiveV2AllowanceRequirements,
  getLegacySweepAllowanceRequirements,
  type V2AllowanceRequirement,
} from './v2AllowanceRequirements';

const MIN_PUSD_BALANCE_FOR_CLAIM_GAS_RAW = BigInt(
  parseUnits(MIN_PUSD_BALANCE_FOR_CLAIM_GAS.toString(), 6).toString(),
);

type PolymarketV2ProtocolDefinition = PolymarketProtocolDefinition;

/**
 * Gamma market version keyed by the position's condition id
 * (`position.outcomeId`), resolved at the provider edge by loading Gamma
 * through `position.marketId`. Only 'v2' routes a claim to the Router; a
 * missing or unknown version keeps the CTF claim.
 */
export type ClaimMarketVersions = Record<string, string | undefined>;

function partitionClaimPositions({
  positions,
  marketVersions,
}: {
  positions: PredictPosition[];
  marketVersions: ClaimMarketVersions;
}): { ctfPositions: PredictPosition[]; v2Positions: PredictPosition[] } {
  const ctfPositions: PredictPosition[] = [];
  const v2Positions: PredictPosition[] = [];

  for (const position of positions) {
    if (marketVersions[position.outcomeId] === 'v2') {
      v2Positions.push(position);
    } else {
      ctfPositions.push(position);
    }
  }

  return { ctfPositions, v2Positions };
}

function buildV2ClaimSubtransactions({
  positions,
}: {
  positions: PredictPosition[];
}): SafeTransaction[] {
  const { router } = POLYMARKET_POSITIONS_PROTOCOL.contracts;

  // negRisk does not change the call: the Router routes the condition id to
  // the V2 module handling binary and neg-risk markets. The Router operator
  // approval is a claim requirement, not part of the redeem calls.
  return positions.map((position) => ({
    to: router,
    data: encodeRouterRedeem({
      conditionId: position.outcomeId,
      outcomeIndex: position.outcomeIndex,
      // Shares are 6-decimal base units; toFixed(6) rounds away float noise
      // so parseUnits never rejects the formatted amount.
      amount: parseUnits(position.size.toFixed(6), 6).toString(),
    }),
    operation: OperationType.Call,
    value: '0',
  }));
}

function buildClaimSubtransactions({
  positions,
  protocol,
}: {
  positions: PredictPosition[];
  protocol: PolymarketV2ProtocolDefinition;
}): SafeTransaction[] {
  return positions.map((position) => ({
    to: position.negRisk
      ? protocol.claim.negRiskTarget
      : protocol.claim.standardTarget,
    data: encodeRedeemPositions({
      collateralToken: protocol.collateral.claimToken,
      parentCollectionId: HASH_ZERO_BYTES32,
      conditionId: position.outcomeId,
      indexSets: [1, 2],
    }),
    operation: OperationType.Call,
    value: '0',
  }));
}

export function getClaimRequirements({
  positions,
  protocol = POLYMARKET_V2_PROTOCOL,
  includeLegacySweep = true,
  marketVersions = {},
}: {
  positions: PredictPosition[];
  protocol?: PolymarketV2ProtocolDefinition;
  includeLegacySweep?: boolean;
  marketVersions?: ClaimMarketVersions;
}): V2AllowanceRequirement[] {
  const { ctfPositions, v2Positions } = partitionClaimPositions({
    positions,
    marketVersions,
  });
  const requiresStandardAdapter = ctfPositions.some(
    (position) => !position.negRisk,
  );
  const requiresNegRiskAdapter = ctfPositions.some(
    (position) => position.negRisk,
  );
  const requiresV2Router = v2Positions.length > 0;

  return [
    ...(includeLegacySweep
      ? getLegacySweepAllowanceRequirements(protocol)
      : []),
    ...getActiveV2AllowanceRequirements(protocol),
    ...(requiresStandardAdapter
      ? [
          {
            type: 'erc1155-operator' as const,
            tokenAddress: protocol.contracts.conditionalTokens,
            operator: protocol.claim.standardTarget,
          },
        ]
      : []),
    ...(requiresNegRiskAdapter
      ? [
          {
            type: 'erc1155-operator' as const,
            tokenAddress: protocol.contracts.conditionalTokens,
            operator: protocol.claim.negRiskTarget,
          },
        ]
      : []),
    ...(requiresV2Router
      ? [
          {
            type: 'erc1155-operator' as const,
            tokenAddress:
              POLYMARKET_POSITIONS_PROTOCOL.contracts.positionManager,
            operator: POLYMARKET_POSITIONS_PROTOCOL.contracts.router,
          },
        ]
      : []),
  ];
}

export interface ClaimPlan {
  gasTokenDeficit: bigint;
  safeLegacyUsdceBalance: bigint;
  eoaPusdBalance: bigint;
  missingRequirements: V2AllowanceRequirement[];
  transactions: SafeTransaction[];
}

export async function planClaim({
  signer,
  positions,
  safeAddress,
  protocol = POLYMARKET_V2_PROTOCOL,
  marketVersions = {},
  safeLegacyUsdceBalance: providedSafeLegacyUsdceBalance,
}: {
  signer: Signer;
  positions: PredictPosition[];
  safeAddress: string;
  protocol?: PolymarketV2ProtocolDefinition;
  marketVersions?: ClaimMarketVersions;
  safeLegacyUsdceBalance?: bigint;
}): Promise<ClaimPlan> {
  const safeLegacyUsdceBalance =
    providedSafeLegacyUsdceBalance ??
    (await getRawTokenBalance({
      address: safeAddress,
      tokenAddress: protocol.collateral.legacyUsdceToken,
    }));

  const [missingRequirements, eoaPusdBalance] = await Promise.all([
    inspectMissingRequirements({
      address: safeAddress,
      requirements: getClaimRequirements({
        positions,
        protocol,
        includeLegacySweep: safeLegacyUsdceBalance > 0n,
        marketVersions,
      }),
    }),
    getRawTokenBalance({
      address: signer.address,
      tokenAddress: protocol.collateral.tradingToken,
    }),
  ]);

  const gasTokenDeficit =
    eoaPusdBalance >= MIN_PUSD_BALANCE_FOR_CLAIM_GAS_RAW
      ? 0n
      : MIN_PUSD_BALANCE_FOR_CLAIM_GAS_RAW - eoaPusdBalance;

  const transactions = compileClaimTransactions({
    protocol,
    signer,
    positions,
    marketVersions,
    safeAddress,
    missingRequirements,
    safeLegacyUsdceBalance,
    gasTokenDeficit,
  });

  return {
    gasTokenDeficit,
    safeLegacyUsdceBalance,
    eoaPusdBalance,
    missingRequirements,
    transactions,
  };
}

function compileClaimTransactions({
  protocol = POLYMARKET_V2_PROTOCOL,
  signer,
  positions,
  marketVersions = {},
  safeAddress,
  missingRequirements,
  safeLegacyUsdceBalance,
  gasTokenDeficit,
}: {
  protocol?: PolymarketV2ProtocolDefinition;
  signer: Signer;
  positions: PredictPosition[];
  marketVersions?: ClaimMarketVersions;
  safeAddress: string;
  missingRequirements: V2AllowanceRequirement[];
  safeLegacyUsdceBalance: bigint;
  gasTokenDeficit: bigint;
}): SafeTransaction[] {
  const transactions = compileAllowanceMaintenanceTransactions({
    protocol,
    safeAddress,
    missingRequirements,
    usdceBalance: safeLegacyUsdceBalance,
  });

  const { ctfPositions, v2Positions } = partitionClaimPositions({
    positions,
    marketVersions,
  });

  transactions.push(
    ...buildClaimSubtransactions({
      positions: ctfPositions,
      protocol,
    }),
    ...buildV2ClaimSubtransactions({ positions: v2Positions }),
  );

  if (gasTokenDeficit > 0n) {
    transactions.push({
      to: protocol.collateral.tradingToken,
      data: encodeErc20Transfer({
        to: signer.address,
        value: gasTokenDeficit,
      }),
      operation: OperationType.Call,
      value: '0',
    });
  }

  return transactions;
}

export async function planDepositWalletClaim({
  positions,
  walletAddress,
  protocol = POLYMARKET_V2_PROTOCOL,
  marketVersions = {},
}: {
  positions: PredictPosition[];
  walletAddress: string;
  protocol?: PolymarketV2ProtocolDefinition;
  marketVersions?: ClaimMarketVersions;
}): Promise<DepositWalletCall[]> {
  if (!positions || positions.length === 0) {
    throw new Error('No positions provided for deposit wallet claim');
  }

  const requirements = filterDepositWalletUnsupportedRequirements(
    getClaimRequirements({
      positions,
      protocol,
      includeLegacySweep: false,
      marketVersions,
    }),
  );

  const missingRequirements = await inspectMissingRequirements({
    address: walletAddress,
    requirements,
  });

  const { ctfPositions, v2Positions } = partitionClaimPositions({
    positions,
    marketVersions,
  });

  const transactions = [
    ...compileRequirementTransactions(missingRequirements),
    ...buildClaimSubtransactions({ positions: ctfPositions, protocol }),
    ...buildV2ClaimSubtransactions({ positions: v2Positions }),
  ];

  if (transactions.length === 0) {
    throw new Error('No deposit wallet claim calls generated');
  }

  return toDepositWalletCalls(transactions);
}

export async function buildClaimTransaction({
  signer,
  positions,
  safeAddress,
  protocol = POLYMARKET_V2_PROTOCOL,
  marketVersions,
  safeLegacyUsdceBalance,
}: {
  signer: Signer;
  positions: PredictPosition[];
  safeAddress: string;
  protocol?: PolymarketV2ProtocolDefinition;
  marketVersions?: ClaimMarketVersions;
  safeLegacyUsdceBalance?: bigint;
}) {
  const plan = await planClaim({
    signer,
    positions,
    safeAddress,
    protocol,
    marketVersions,
    safeLegacyUsdceBalance,
  });

  return buildSignedSafeExecution({
    signer,
    safeAddress,
    transactions: plan.transactions,
    type: TransactionType.predictClaim,
  });
}
