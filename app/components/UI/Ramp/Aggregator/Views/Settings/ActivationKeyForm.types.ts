export interface ActivationKeyFormParams {
  onSubmit: (key: string, label: string, active: boolean) => void;
  key: string;
  active: boolean;
  label: string;
}
