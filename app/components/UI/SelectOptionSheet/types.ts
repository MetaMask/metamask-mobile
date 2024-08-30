export interface iSelectOption {
  key?: string;
  value?: string;
  label?: string;
}

export interface iSelectOptionSheet {
  defaultValue?: string;
  label: string;
  selectedValue?: string;
  options: iSelectOption[];
  onValueChange: (val: string | undefined) => void;
}

export interface OptionsSheetParams {
  label: string;
  options: iSelectOption[];
  selectedValue?: string;
  onValueChange: (val: string) => void;
}
