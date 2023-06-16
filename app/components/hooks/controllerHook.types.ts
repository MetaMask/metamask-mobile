export interface ControllerHookType {
  data: any;
  error?: Error;
  retry?: () => void;
  loading?: boolean;
}
