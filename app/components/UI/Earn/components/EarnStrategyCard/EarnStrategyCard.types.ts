export enum EarnStrategyRiskLevel {
  Recommended = 'recommended',
  Low = 'low',
  Medium = 'medium',
  High = 'high',
}

export interface EarnStrategyCardProps {
  risk: EarnStrategyRiskLevel;
  title: string;
  subtitle: string;
  tertiaryText: string;
  isFeeSubsidized?: boolean;
  selected?: boolean;
  onPress?: () => void;
  testID?: string;
}
