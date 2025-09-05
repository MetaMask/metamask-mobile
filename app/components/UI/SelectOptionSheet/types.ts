export interface ISelectOption {
  key?: string;
  value?: string;
  label?: string;
}

export interface ISelectOptionSheet {
  defaultValue?: string;
  label: string;
  selectedValue?: string;
  options: ISelectOption[];
  onValueChange: (val: string) => void;
}

export type OptionsSheetParams = {
  label: string;
  options: ISelectOption[];
  selectedValue?: string;
  onValueChange: (val: string) => void;
};
