import { MATIC_CONTRACTS } from '../constants';

export const SAFE_FACTORY_NAME = 'Polymarket Contract Proxy Factory';

export const SAFE_FACTORY_ADDRESS =
  '0xaacFeEa03eb1561C4e67d661e40682Bd20E3541b';

export const SAFE_MULTISEND_ADDRESS =
  '0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761';

export const usdcSpenders = [
  MATIC_CONTRACTS.conditionalTokens, // Conditional Tokens Framework
  MATIC_CONTRACTS.exchange, // CTF Exchange
  MATIC_CONTRACTS.negRiskExchange, // Neg Risk CTF Exchange
  MATIC_CONTRACTS.negRiskAdapter,
];

export const outcomeTokenSpenders = [
  MATIC_CONTRACTS.exchange, // CTF Exchange
  MATIC_CONTRACTS.negRiskExchange, // Neg Risk Exchange
  MATIC_CONTRACTS.negRiskAdapter, // Neg Risk Adapter
];
