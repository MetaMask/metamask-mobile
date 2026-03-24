export interface QuickPickButtonOption {
  label: string;
  onPress: () => void;
}

export interface SwapsKeypadRef {
  open: () => void;
  close: () => void;
  isOpen: () => boolean;
}
