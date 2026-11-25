import type { RecurringConfirmOrderModalParams } from '../RecurringConfirmOrderSheet/RecurringConfirmOrderSheet.types';

export interface CostToleranceOption {
  id: string;
  label: string;
  selected?: boolean;
  onPress: () => void;
}

export interface PriceTolerancePresetModalProps {
  initialValue: string;
  getDescription: (value: string) => string;
  onCustomPress: () => void;
  onSubmit: (value: string) => void;
  goBack: () => void;
}

export interface PriceToleranceCustomModalProps {
  initialValue: string;
  onConfirm: (value: string) => void;
  goBack: () => void;
}

export interface RecurringPriceToleranceModalParams {
  sourceModal?: {
    screen: 'RecurringConfirmOrderModal';
    params: RecurringConfirmOrderModalParams;
  };
}
