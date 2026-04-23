export interface PredictChipItem {
  key: string;
  label: string;
}

export interface PredictChipListProps {
  chips: PredictChipItem[];
  activeChipKey: string;
  onChipSelect: (key: string) => void;
  testID?: string;
}
