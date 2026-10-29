import {
  POLYMARKET_POSITIONS_PROTOCOL,
  type BasePolymarketPositionsProtocolDefinition,
} from '../protocol/definitions';
import { PERMIT2_ADDRESS } from '../safe/constants';
import type { V2AllowanceRequirement } from './v2AllowanceRequirements';

/**
 * Allowance requirements for the positions protocol (Polymarket Protocol
 * V2). Both buy and sell share one requirement list, mirroring the CTF
 * builders and reusing the same generic requirement shapes: the pUSD
 * allowance covers collateral, selling approves the PositionManager as
 * operator for ExchangeV3, and Permit2 fee collection pulls pUSD through
 * Permit2. The legacy-Safe trade planner layers the CTF legacy-sweep
 * requirement on top when there is USDC.e to wrap; the deposit-wallet
 * planner filters Permit2 out, as it does for the CTF list.
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
    {
      type: 'erc20-allowance',
      tokenAddress: protocol.collateral.feeAuthorizationToken,
      spender: PERMIT2_ADDRESS,
    },
  ];
}
