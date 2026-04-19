import { TransactionType } from '@metamask/transaction-controller';
import { parseUnits } from 'ethers/lib/utils';
import type { PredictPosition } from '../../../types';
import type { Signer } from '../../types';
import {
  CONDITIONAL_TOKEN_DECIMALS,
  MIN_COLLATERAL_BALANCE_FOR_CLAIM,
} from '../constants';
import {
  POLYMARKET_V2_PROTOCOL,
  type PolymarketProtocolDefinition,
} from '../protocol/definitions';
import { encodeUnwrap, encodeWrap } from '../protocol/orderCodec';
import { OperationType, type SafeTransaction } from '../safe/types';
import { encodeRedeemNegRiskPositions, encodeRedeemPositions } from '../utils';
import { buildSignedSafeExecution, getRawTokenBalance } from './core';
import { compileRequirementTransactions } from './compileRequirementTransactions';
import { inspectMissingRequirements } from './inspectMissingRequirements';
import { getCanonicalV2AllowanceRequirements } from './v2AllowanceRequirements';

const MIN_CLAIM_BALANCE_RAW = BigInt(
  parseUnits(MIN_COLLATERAL_BALANCE_FOR_CLAIM.toString(), 6).toString(),
);

function buildClaimSubtransactions({
  positions,
  protocol,
}: {
  positions: PredictPosition[];
  protocol: PolymarketProtocolDefinition;
}): SafeTransaction[] {
  return positions.map((position) => {
    if (position.negRisk) {
      const amounts: bigint[] = [0n, 0n];
      amounts[position.outcomeIndex] = BigInt(
        parseUnits(
          position.size.toString(),
          CONDITIONAL_TOKEN_DECIMALS,
        ).toString(),
      );

      return {
        to: protocol.contracts.negRiskAdapter,
        data: encodeRedeemNegRiskPositions({
          conditionId: position.outcomeId,
          amounts,
        }),
        operation: OperationType.Call,
        value: '0',
      };
    }

    return {
      to: protocol.contracts.conditionalTokens,
      data: encodeRedeemPositions({
        collateralToken: protocol.collateral.claimToken,
        parentCollectionId:
          '0x0000000000000000000000000000000000000000000000000000000000000000',
        conditionId: position.outcomeId,
        indexSets: [1, 2],
      }),
      operation: OperationType.Call,
      value: '0',
    };
  });
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
  protocol?: PolymarketProtocolDefinition;
}): Promise<ClaimPlan> {
  const [missingRequirements, safeUsdceBalance, eoaUsdceBalance] =
    await Promise.all([
      inspectMissingRequirements({
        address: safeAddress,
        requirements: getCanonicalV2AllowanceRequirements(protocol),
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
  protocol?: PolymarketProtocolDefinition;
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
  protocol?: PolymarketProtocolDefinition;
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
