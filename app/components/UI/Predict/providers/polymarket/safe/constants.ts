import { MATIC_CONTRACTS } from '../constants';

export const SAFE_FACTORY_NAME = 'Polymarket Contract Proxy Factory';

export const SAFE_FACTORY_ADDRESS =
  '0xaacFeEa03eb1561C4e67d661e40682Bd20E3541b';

export const SAFE_MULTISEND_ADDRESS =
  '0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761';

// Constants from the contract
export const SAFE_TX_TYPEHASH =
  '0xbb8310d486368db6bd6f849402fdd73ad53d316b5a4b2644ad6efe0f941286d8';
export const DOMAIN_SEPARATOR_TYPEHASH =
  '0x47e79534a245952e8b16893a336b85a3d9ea9fa8c573f3d803afb92a79469218';

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
