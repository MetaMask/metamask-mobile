import { TransactionType } from '@metamask/transaction-controller';
import { parseUnits } from 'ethers/lib/utils';
import type { PredictPosition } from '../../../types';
import type { Signer } from '../../types';
import {
  HASH_ZERO_BYTES32,
  MIN_COLLATERAL_BALANCE_FOR_CLAIM,
} from '../constants';
import {
  POLYMARKET_V2_PROTOCOL,
  type PolymarketProtocolDefinition,
} from '../protocol/definitions';
import { encodeUnwrap, encodeWrap } from '../protocol/orderCodec';
import { OperationType, type SafeTransaction } from '../safe/types';
import { encodeRedeemPositions } from '../utils';
import { buildSignedSafeExecution, getRawTokenBalance } from './core';
import { compileRequirementTransactions } from './compileRequirementTransactions';
import { inspectMissingRequirements } from './inspectMissingRequirements';
import {
  getCanonicalV2AllowanceRequirements,
  type V2AllowanceRequirement,
} from './v2AllowanceRequirements';

const MIN_CLAIM_BALANCE_RAW = BigInt(
  parseUnits(MIN_COLLATERAL_BALANCE_FOR_CLAIM.toString(), 6).toString(),
);

type PolymarketV2ProtocolDefinition = Extract<
  PolymarketProtocolDefinition,
  { key: 'v2' }
>;

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
}: {
  positions: PredictPosition[];
  protocol?: PolymarketV2ProtocolDefinition;
}): V2AllowanceRequirement[] {
  const requirements = getCanonicalV2AllowanceRequirements(protocol);

  if (positions.some((position) => !position.negRisk)) {
    requirements.push({
      type: 'erc1155-operator',
      tokenAddress: protocol.contracts.conditionalTokens,
      operator: protocol.claim.standardTarget,
    });
  }

  if (positions.some((position) => position.negRisk)) {
    requirements.push({
      type: 'erc1155-operator',
      tokenAddress: protocol.contracts.conditionalTokens,
      operator: protocol.claim.negRiskTarget,
    });
  }

  return requirements;
}

export interface ClaimPlan {
  deficit: bigint;
  safeUsdceBalance: bigint;
  eoaUsdceBalance: bigint;
  missingRequirements: ReturnType<typeof getCanonicalV2AllowanceRequirements>;
  transactions: SafeTransaction[];
}

export async function planClaim({
  signer,
  positions,
  safeAddress,
  protocol = POLYMARKET_V2_PROTOCOL,
}: {
  signer: Signer;
  positions: PredictPosition[];
  safeAddress: string;
  protocol?: PolymarketV2ProtocolDefinition;
}): Promise<ClaimPlan> {
  const [missingRequirements, safeUsdceBalance, eoaUsdceBalance] =
    await Promise.all([
      inspectMissingRequirements({
        address: safeAddress,
        requirements: getClaimRequirements({ positions, protocol }),
      }),
      getRawTokenBalance({
        address: safeAddress,
        tokenAddress: protocol.collateral.legacyUsdceToken,
      }),
      getRawTokenBalance({
        address: signer.address,
        tokenAddress: protocol.collateral.legacyUsdceToken,
      }),
    ]);

  const deficit =
    eoaUsdceBalance >= MIN_CLAIM_BALANCE_RAW
      ? 0n
      : MIN_CLAIM_BALANCE_RAW - eoaUsdceBalance;

  const transactions = compileClaimTransactions({
    protocol,
    signer,
    positions,
    safeAddress,
    missingRequirements,
    safeUsdceBalance,
    deficit,
  });

  return {
    deficit,
    safeUsdceBalance,
    eoaUsdceBalance,
    missingRequirements,
    transactions,
  };
}

export function compileClaimTransactions({
  protocol = POLYMARKET_V2_PROTOCOL,
  signer,
  positions,
  safeAddress,
  missingRequirements,
  safeUsdceBalance,
  deficit,
}: {
  protocol?: PolymarketV2ProtocolDefinition;
  signer: Signer;
  positions: PredictPosition[];
  safeAddress: string;
  missingRequirements: ReturnType<typeof getCanonicalV2AllowanceRequirements>;
  safeUsdceBalance: bigint;
  deficit: bigint;
}): SafeTransaction[] {
  const transactions = compileRequirementTransactions(missingRequirements);

  if (
    safeUsdceBalance > 0n &&
    protocol.collateral.onrampAddress !== undefined
  ) {
    transactions.push({
      to: protocol.collateral.onrampAddress,
      data: encodeWrap({
        asset: protocol.collateral.legacyUsdceToken,
        to: safeAddress,
        amount: safeUsdceBalance,
      }),
      operation: OperationType.Call,
      value: '0',
    });
  }

  transactions.push(
    ...buildClaimSubtransactions({
      positions,
      protocol,
    }),
  );

  if (deficit > 0n && protocol.collateral.offrampAddress !== undefined) {
    transactions.push({
      to: protocol.collateral.offrampAddress,
      data: encodeUnwrap({
        asset: protocol.collateral.legacyUsdceToken,
        to: signer.address,
        amount: deficit,
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
}: {
  signer: Signer;
  positions: PredictPosition[];
  safeAddress: string;
  protocol?: PolymarketV2ProtocolDefinition;
}) {
  const plan = await planClaim({
    signer,
    positions,
    safeAddress,
    protocol,
  });

  return buildSignedSafeExecution({
    signer,
    safeAddress,
    transactions: plan.transactions,
    type: TransactionType.predictClaim,
  });
}
