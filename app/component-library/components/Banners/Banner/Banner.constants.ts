/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
// External dependencies.
import { DEFAULT_BANNERALERT_SEVERITY } from './variants/BannerAlert/BannerAlert.constants';
import { ButtonVariants } from '../../Buttons/Button';

// Internal dependencies.
import { BannerVariant, BannerProps } from './Banner.types';

// Defaults
export const DEFAULT_BANNER_VARIANT = BannerVariant.Alert;

// Sample consts
export const SAMPLE_BANNER_TITLE = 'Sample Banner Title';
export const SAMPLE_BANNER_DESCRIPTION = 'Sample Banner Description';
export const SAMPLE_BANNER_ACTIONBUTTONLABEL = 'Sample Action Button Label';

export const SAMPLE_BANNER_PROPS: BannerProps = {
  variant: BannerVariant.Alert,
  severity: DEFAULT_BANNERALERT_SEVERITY,
  title: SAMPLE_BANNER_TITLE,
  description: SAMPLE_BANNER_DESCRIPTION,
  actionButtonProps: {
    variant: ButtonVariants.Link,
    label: SAMPLE_BANNER_ACTIONBUTTONLABEL,
    onPress: () => console.log('actionButton clicked!'),
  },
  onClose: () => console.log('closeButton clicked!'),
};
