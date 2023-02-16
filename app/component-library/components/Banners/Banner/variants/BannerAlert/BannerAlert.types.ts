// External dependencies.
import { BannerBaseProps } from '../../foundation/BannerBase/BannerBase.types';

/**
 * Severity of the BannerAlert.
 */
export enum BannerAlertSeverity {
  Info = 'Info',
  Success = 'Success',
  Warning = 'Warning',
  Error = 'Error',
}

/**
 * BannerAlert component props.
 */
export interface BannerAlertProps extends BannerBaseProps {
  /**
   * Severity of the BannerAlert.
   * @default BannerAlertSeverity.Info
   */
  severity?: BannerAlertSeverity;
}
