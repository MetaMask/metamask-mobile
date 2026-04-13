import type { PredictOutcomeGroup } from '../../types';

export interface PredictOutcomeGroupChipsProps {
  groups: PredictOutcomeGroup[];
  selectedGroupKey: string;
  onGroupSelect: (key: string) => void;
  testID?: string;
}
