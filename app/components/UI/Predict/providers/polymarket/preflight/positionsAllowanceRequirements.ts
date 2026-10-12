import {
  POLYMARKET_POSITIONS_PROTOCOL,
  type BasePolymarketPositionsProtocolDefinition,
} from '../protocol/definitions';
import type { V2AllowanceRequirement } from './v2AllowanceRequirements';

/**
 * Allowance requirements for the positions protocol (Polymarket Protocol
 * V2). Both buy and sell share one requirement list, mirroring the CTF
 * builders and reusing the same generic requirement shapes: the pUSD
 * allowance covers collateral and fees, and selling approves the
 * PositionManager as operator for ExchangeV3.
 */
export function getPositionsAllowanceRequirements(
  protocol: BasePolymarketPositionsProtocolDefinition = POLYMARKET_POSITIONS_PROTOCOL,
): V2AllowanceRequirement[] {
  return [
    {
      type: 'erc20-allowance',
      tokenAddress: protocol.collateral.tradingToken,
      spender: protocol.contracts.exchange,
    },
    {
      type: 'erc1155-operator',
      tokenAddress: protocol.contracts.positionManager,
      operator: protocol.contracts.exchange,
    },
  ];
}
