// Common types for controller hooks return values
export interface ControllerHookType<T> {
  /** The data returned by the controller */
  data: T;
  /** The error returned by the controller */
  error?: Error;
  /** The method to retry the controller in case of error */
  retry?: () => void;
  /** The controller loading status: true when data is available, false otherwise */
  loading?: boolean;
}
