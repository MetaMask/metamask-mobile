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

export function getCanonicalV2AllowanceRequirements(
  protocol: PolymarketProtocolDefinition = POLYMARKET_V2_PROTOCOL,
): V2AllowanceRequirement[] {
  const { collateral, contracts } = protocol;
  const pUsdToken = collateral.tradingToken;

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
    {
      type: 'erc20-allowance',
      tokenAddress: pUsdToken,
      spender: contracts.conditionalTokens,
    },
    {
      type: 'erc20-allowance',
      tokenAddress: pUsdToken,
      spender: contracts.exchange,
    },
    {
      type: 'erc20-allowance',
      tokenAddress: pUsdToken,
      spender: contracts.negRiskExchange,
    },
    {
      type: 'erc20-allowance',
      tokenAddress: pUsdToken,
      spender: contracts.negRiskAdapter,
    },
    {
      type: 'erc20-allowance',
      tokenAddress: pUsdToken,
      spender: PERMIT2_ADDRESS,
    },
    {
      type: 'erc20-allowance',
      tokenAddress: pUsdToken,
      spender: collateral.offrampAddress,
    },
    {
      type: 'erc1155-operator',
      tokenAddress: contracts.conditionalTokens,
      operator: contracts.exchange,
    },
    {
      type: 'erc1155-operator',
      tokenAddress: contracts.conditionalTokens,
      operator: contracts.negRiskExchange,
    },
    {
      type: 'erc1155-operator',
      tokenAddress: contracts.conditionalTokens,
      operator: contracts.negRiskAdapter,
    },
  ];
}
