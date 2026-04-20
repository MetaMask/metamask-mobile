import type { ContractConfig } from '../types';
import type { PredictFeatureFlags } from '../../../types/flags';
import {
  HASH_ZERO_BYTES32,
  MATIC_CONTRACTS,
  MATIC_CONTRACTS_V2,
  COLLATERAL_OFFRAMP_ADDRESS,
  COLLATERAL_ONRAMP_ADDRESS,
  CTF_COLLATERAL_ADAPTER_ADDRESS,
  NEG_RISK_CTF_COLLATERAL_ADAPTER_ADDRESS,
  USDC_E_ADDRESS,
} from '../constants';
import Logger from '../../../../../../util/Logger';

export type PolymarketProtocolKey = 'v1' | 'v2';
export type DepositExecutionMode = 'usdce-transfer' | 'pusd-transfer';
export type WithdrawExecutionMode =
  | 'usdce-transfer'
  | 'usdce-deficit-unwrap'
  | 'pusd-transfer';

interface BasePolymarketProtocolDefinition {
  key: PolymarketProtocolKey;
  contracts: ContractConfig;
  collateral: {
    legacyUsdceToken: string;
    tradingToken: string;
    claimToken: string;
    feeAuthorizationToken: string;
    balanceTokens: string[];
    onrampAddress?: string;
    offrampAddress?: string;
  };
  order: {
    domainVersion: '1' | '2';
    metadata: string;
    getBuilderCode?: () => string;
  };
  transport: {
    clobVersionHeader?: '2';
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

const BUILDER_CODE_ENV = 'MM_PREDICT_BUILDER_CODE';

function isBytes32Hex(value: string | undefined): value is string {
  return Boolean(value?.match(/^0x[a-fA-F0-9]{64}$/u));
}

export function getClobV2BuilderCode(): string {
  const value = process.env[BUILDER_CODE_ENV];

  if (isBytes32Hex(value)) {
    return value;
  }

  const reason = value ? 'invalid' : 'missing';

  Logger.log(
    `Polymarket CLOB v2 builder code ${reason} in ${BUILDER_CODE_ENV}; falling back to zero bytes32 value`,
  );

  return HASH_ZERO_BYTES32;
}

export const POLYMARKET_V1_PROTOCOL = {
  key: 'v1',
  contracts: MATIC_CONTRACTS,
  collateral: {
    legacyUsdceToken: MATIC_CONTRACTS.collateral,
    tradingToken: MATIC_CONTRACTS.collateral,
    claimToken: MATIC_CONTRACTS.collateral,
    feeAuthorizationToken: MATIC_CONTRACTS.collateral,
    balanceTokens: [MATIC_CONTRACTS.collateral],
    onrampAddress: undefined,
    offrampAddress: undefined,
  },
  order: {
    domainVersion: '1',
    metadata: HASH_ZERO_BYTES32,
    getBuilderCode: undefined,
  },
  transport: {
    clobVersionHeader: undefined,
  },
  workflow: {
    depositMode: 'usdce-transfer',
    withdrawMode: 'usdce-transfer',
  },
  claim: {
    standardTarget: MATIC_CONTRACTS.conditionalTokens,
    negRiskTarget: MATIC_CONTRACTS.negRiskAdapter,
  },
} satisfies BasePolymarketProtocolDefinition;

export const POLYMARKET_V2_PROTOCOL = {
  key: 'v2',
  contracts: MATIC_CONTRACTS_V2,
  collateral: {
    legacyUsdceToken: USDC_E_ADDRESS,
    tradingToken: MATIC_CONTRACTS_V2.collateral,
    claimToken: MATIC_CONTRACTS_V2.collateral,
    feeAuthorizationToken: MATIC_CONTRACTS_V2.collateral,
    balanceTokens: [USDC_E_ADDRESS, MATIC_CONTRACTS_V2.collateral],
    onrampAddress: COLLATERAL_ONRAMP_ADDRESS,
    offrampAddress: COLLATERAL_OFFRAMP_ADDRESS,
  },
  order: {
    domainVersion: '2',
    metadata: HASH_ZERO_BYTES32,
    getBuilderCode: getClobV2BuilderCode,
  },
  transport: {
    clobVersionHeader: '2',
  },
  workflow: {
    depositMode: 'usdce-transfer',
    withdrawMode: 'usdce-deficit-unwrap',
  },
  claim: {
    standardTarget: CTF_COLLATERAL_ADAPTER_ADDRESS,
    negRiskTarget: NEG_RISK_CTF_COLLATERAL_ADAPTER_ADDRESS,
  },
} satisfies BasePolymarketProtocolDefinition;

export type PolymarketProtocolDefinition =
  | typeof POLYMARKET_V1_PROTOCOL
  | typeof POLYMARKET_V2_PROTOCOL;

export function resolvePolymarketProtocol(
  featureFlags: Pick<PredictFeatureFlags, 'predictClobV2Enabled'>,
): PolymarketProtocolDefinition {
  return featureFlags.predictClobV2Enabled
    ? POLYMARKET_V2_PROTOCOL
    : POLYMARKET_V1_PROTOCOL;
}
