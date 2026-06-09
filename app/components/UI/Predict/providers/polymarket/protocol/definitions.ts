import type { ContractConfig } from '../types';
import {
  HASH_ZERO_BYTES32,
  MATIC_CONTRACTS_V2,
  DEFAULT_CLOB_BASE_URL,
  COLLATERAL_ONRAMP_ADDRESS,
  CTF_COLLATERAL_ADAPTER_ADDRESS,
  NEG_RISK_CTF_COLLATERAL_ADAPTER_ADDRESS,
  USDC_E_ADDRESS,
} from '../constants';
import Logger from '../../../../../../util/Logger';

export type PolymarketProtocolKey = 'v2';
export type DepositExecutionMode = 'pusd-transfer';
export type WithdrawExecutionMode = 'pusd-transfer';

interface BasePolymarketProtocolDefinition {
  key: PolymarketProtocolKey;
  contracts: ContractConfig;
  collateral: {
    /**
     * Legacy Safe USDC.e is hidden from user-facing flows and only used for the
     * one-release opportunistic sweep into pUSD. TODO: remove after sweep window.
     */
    legacyUsdceToken: string;
    tradingToken: string;
    claimToken: string;
    feeAuthorizationToken: string;
    onrampAddress: string;
  };
  order: {
    domainVersion: '2';
    metadata: string;
    getBuilderCode: () => string;
  };
  transport: {
    clobVersionHeader: '2';
    clobBaseUrl: string;
  };
  workflow: {
    depositMode: DepositExecutionMode;
    withdrawMode: WithdrawExecutionMode;
  };
  claim: {
    standardTarget: string;
    negRiskTarget: string;
  };
}

function isBytes32Hex(value: string | undefined): value is string {
  return Boolean(value?.match(/^0x[a-fA-F0-9]{64}$/u));
}

export function getClobV2BuilderCode(): string {
  const value = process.env.MM_PREDICT_BUILDER_CODE;

  if (isBytes32Hex(value)) {
    return value;
  }

  const reason = value ? 'invalid' : 'missing';

  Logger.log(
    `Polymarket CLOB v2 builder code ${reason} in MM_PREDICT_BUILDER_CODE; falling back to zero bytes32 value`,
  );

  return HASH_ZERO_BYTES32;
}

export const POLYMARKET_V2_PROTOCOL = {
  key: 'v2',
  contracts: MATIC_CONTRACTS_V2,
  collateral: {
    legacyUsdceToken: USDC_E_ADDRESS,
    tradingToken: MATIC_CONTRACTS_V2.collateral,
    claimToken: MATIC_CONTRACTS_V2.collateral,
    feeAuthorizationToken: MATIC_CONTRACTS_V2.collateral,
    onrampAddress: COLLATERAL_ONRAMP_ADDRESS,
  },
  order: {
    domainVersion: '2',
    metadata: HASH_ZERO_BYTES32,
    getBuilderCode: getClobV2BuilderCode,
  },
  transport: {
    clobVersionHeader: '2',
    clobBaseUrl: DEFAULT_CLOB_BASE_URL,
  },
  workflow: {
    depositMode: 'pusd-transfer',
    withdrawMode: 'pusd-transfer',
  },
  claim: {
    standardTarget: CTF_COLLATERAL_ADAPTER_ADDRESS,
    negRiskTarget: NEG_RISK_CTF_COLLATERAL_ADAPTER_ADDRESS,
  },
} satisfies BasePolymarketProtocolDefinition;

export type PolymarketProtocolDefinition = typeof POLYMARKET_V2_PROTOCOL;

export function getProtocolDepositTokenAddress(
  protocol: PolymarketProtocolDefinition,
): string {
  return protocol.collateral.tradingToken;
}

export function getProtocolWithdrawTokenAddress(
  protocol: PolymarketProtocolDefinition,
): string {
  return protocol.collateral.tradingToken;
}
