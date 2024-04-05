// External dependencies.
import { BannerBaseProps } from '../../foundation/BannerBase/BannerBase.types';
import { IconName } from '../../../../Icons/Icon';
import { BannerVariant } from '../../Banner.types';

/**
 * Severity of the BannerAlert.
 */
export enum BannerAlertSeverity {
  Info = 'Info',
  Success = 'Success',
  Warning = 'Warning',
  // eslint-disable-next-line @typescript-eslint/no-shadow
  Error = 'Error',
}

/**
 * Mapping of IconName by BannerAlertSeverity.
 */
export type IconNameByBannerAlertSeverity = {
  [key in BannerAlertSeverity]: IconName;
};

/**
 * BannerAlert component props.
 */
export interface BannerAlertProps extends BannerBaseProps {
  /**
   * Variant of Banner
   */
  variant?: BannerVariant.Alert;
  /**
   * Severity of the BannerAlert.
   * @default BannerAlertSeverity.Info
   */
  severity?: BannerAlertSeverity;
}

/**
 * Style sheet Banner Alert parameters.
 */
export type BannerAlertStyleSheetVars = Pick<BannerAlertProps, 'style'> & {
  severity: BannerAlertSeverity;
};
