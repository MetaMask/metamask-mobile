export interface SlippageOption {
  label: string;
  value: string;
}

export interface SlippageModalRef {
  show: () => void;
  hide: () => void;
}

export interface SlippageModalProps {
  onSlippageSelected: (slippage: string) => void;
  selectedSlippage: string;
}
