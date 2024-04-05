// External dependencies.
import { BannerAlertProps } from './variants/BannerAlert/BannerAlert.types';
import { BannerTipProps } from './variants/BannerTip/BannerTip.types';

/**
 * Banner variant.
 */
export enum BannerVariant {
  Alert = 'Alert',
  Tip = 'Tip',
}

/**
 * Banner component props.
 */
export type BannerProps = (BannerAlertProps | BannerTipProps) & {
  /**
   * Variant of Banner.
   */
  variant: BannerVariant;
};
