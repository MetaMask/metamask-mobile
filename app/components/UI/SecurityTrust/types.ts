export type {
  TokenSecurityData,
  TokenSecurityFeature,
  TokenSecurityFees,
  TokenSecurityFinancialStats,
  TokenSecurityHolder,
  TokenSecurityMarket,
  TokenSecurityMetadata,
} from '@metamask/assets-controllers';

export enum RiskLevel {
  Low = 'LOW',
  Medium = 'MEDIUM',
  High = 'HIGH',
  Unknown = 'UNKNOWN',
}

export interface FeatureTag {
  label: string;
  isPositive: boolean;
}
