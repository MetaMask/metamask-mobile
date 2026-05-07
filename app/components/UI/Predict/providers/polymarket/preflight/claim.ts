import { TransactionType } from '@metamask/transaction-controller';
import { parseUnits } from 'ethers/lib/utils';
import type { PredictPosition } from '../../../types';
import type { Signer } from '../../types';
import {
  HASH_ZERO_BYTES32,
  MIN_PUSD_BALANCE_FOR_CLAIM_GAS,
} from '../constants';
import {
  POLYMARKET_V2_PROTOCOL,
  type PolymarketProtocolDefinition,
} from '../protocol/definitions';
import { OperationType, type SafeTransaction } from '../safe/types';
import { encodeErc20Transfer, encodeRedeemPositions } from '../utils';
import {
  buildSignedSafeExecution,
  compileAllowanceMaintenanceTransactions,
  getRawTokenBalance,
} from './core';
import { inspectMissingRequirements } from './inspectMissingRequirements';
import {
  getActiveV2AllowanceRequirements,
  getLegacySweepAllowanceRequirements,
  type V2AllowanceRequirement,
} from './v2AllowanceRequirements';

const MIN_PUSD_BALANCE_FOR_CLAIM_GAS_RAW = BigInt(
  parseUnits(MIN_PUSD_BALANCE_FOR_CLAIM_GAS.toString(), 6).toString(),
);

type PolymarketV2ProtocolDefinition = PolymarketProtocolDefinition;

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
}: {
  positions: PredictPosition[];
  protocol?: PolymarketV2ProtocolDefinition;
  includeLegacySweep?: boolean;
}): V2AllowanceRequirement[] {
  const requiresStandardAdapter = positions.some(
    (position) => !position.negRisk,
  );
  const requiresNegRiskAdapter = positions.some((position) => position.negRisk);

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
  safeLegacyUsdceBalance: providedSafeLegacyUsdceBalance,
}: {
  signer: Signer;
  positions: PredictPosition[];
  safeAddress: string;
  protocol?: PolymarketV2ProtocolDefinition;
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
  safeAddress,
  missingRequirements,
  safeLegacyUsdceBalance,
  gasTokenDeficit,
}: {
  protocol?: PolymarketV2ProtocolDefinition;
  signer: Signer;
  positions: PredictPosition[];
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

  transactions.push(
    ...buildClaimSubtransactions({
      positions,
      protocol,
    }),
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

export async function buildClaimTransaction({
  signer,
  positions,
  safeAddress,
  protocol = POLYMARKET_V2_PROTOCOL,
  safeLegacyUsdceBalance,
}: {
  signer: Signer;
  positions: PredictPosition[];
  safeAddress: string;
  protocol?: PolymarketV2ProtocolDefinition;
  safeLegacyUsdceBalance?: bigint;
}) {
  const plan = await planClaim({
    signer,
    positions,
    safeAddress,
    protocol,
    safeLegacyUsdceBalance,
  });

  return buildSignedSafeExecution({
    signer,
    safeAddress,
    transactions: plan.transactions,
    type: TransactionType.predictClaim,
  });
}
