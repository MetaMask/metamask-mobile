import {
  POLYMARKET_V2_PROTOCOL,
  type PolymarketProtocolDefinition,
} from '../protocol/definitions';
import { PERMIT2_ADDRESS } from '../safe/constants';

export interface Erc20AllowanceRequirement {
  type: 'erc20-allowance';
  tokenAddress: string;
  spender: string;
}

export interface Erc1155OperatorRequirement {
  type: 'erc1155-operator';
  tokenAddress: string;
  operator: string;
}

export type V2AllowanceRequirement =
  | Erc20AllowanceRequirement
  | Erc1155OperatorRequirement;

function buildErc20AllowanceRequirements({
  tokenAddress,
  spenders,
}: {
  tokenAddress: string;
  spenders: string[];
}): Erc20AllowanceRequirement[] {
  return spenders.map((spender) => ({
    type: 'erc20-allowance',
    tokenAddress,
    spender,
  }));
}

function buildErc1155OperatorRequirements({
  tokenAddress,
  operators,
}: {
  tokenAddress: string;
  operators: string[];
}): Erc1155OperatorRequirement[] {
  return operators.map((operator) => ({
    type: 'erc1155-operator',
    tokenAddress,
    operator,
  }));
}

export function getCanonicalV2AllowanceRequirements(
  protocol: PolymarketProtocolDefinition = POLYMARKET_V2_PROTOCOL,
): V2AllowanceRequirement[] {
  const { collateral, contracts } = protocol;

  if (!collateral.onrampAddress || !collateral.offrampAddress) {
    throw new Error(
      'Polymarket CLOB v2 collateral ramp addresses are required',
    );
  }

  return [
    {
      type: 'erc20-allowance',
      tokenAddress: collateral.legacyUsdceToken,
      spender: collateral.onrampAddress,
    },
    ...buildErc20AllowanceRequirements({
      tokenAddress: collateral.tradingToken,
      spenders: [
        contracts.conditionalTokens,
        contracts.exchange,
        contracts.negRiskExchange,
        contracts.negRiskAdapter,
        PERMIT2_ADDRESS,
        collateral.offrampAddress,
      ],
    }),
    ...buildErc1155OperatorRequirements({
      tokenAddress: contracts.conditionalTokens,
      operators: [
        contracts.exchange,
        contracts.negRiskExchange,
        contracts.negRiskAdapter,
      ],
    }),
  ];
}
