export interface GasOption {
  estimatedTime?: string;
  isSelected: boolean;
  key: string;
  name: string;
  onSelect: () => void;
  value: string;
  valueInFiat?: string;
}
