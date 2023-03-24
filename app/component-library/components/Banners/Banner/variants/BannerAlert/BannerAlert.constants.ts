/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */

// External dependencies.
import { IconName, IconSize } from '../../../../Icons/Icon';
import { BannerVariant } from '../../Banner.types';

// Internal dependencies.
import {
  BannerAlertProps,
  BannerAlertSeverity,
  IconNameByBannerAlertSeverity,
} from './BannerAlert.types';

// Defaults
export const DEFAULT_BANNERALERT_SEVERITY = BannerAlertSeverity.Info;
export const DEFAULT_BANNERALERT_ICONSIZE = IconSize.Lg;

// Mappings
export const ICONNAME_BY_BANNERALERTSEVERITY: IconNameByBannerAlertSeverity = {
  [BannerAlertSeverity.Info]: IconName.Info,
  [BannerAlertSeverity.Success]: IconName.Confirmation,
  [BannerAlertSeverity.Error]: IconName.Danger,
  [BannerAlertSeverity.Warning]: IconName.Danger,
};

// Test IDs
export const BANNERALERT_TEST_ID = 'banneralert';

// Sample consts
export const SAMPLE_BANNERALERT_TITLE = 'Sample Banner Alert Title';
export const SAMPLE_BANNERALERT_DESCRIPTION = 'Sample Banner Alert Description';
export const SAMPLE_BANNERALERT_ACTIONBUTTONLABEL =
  'Sample Action Button Label';
export const SAMPLE_BANNERALERT_PROPS: BannerAlertProps = {
  variant: BannerVariant.Alert,
  severity: DEFAULT_BANNERALERT_SEVERITY,
  title: SAMPLE_BANNERALERT_TITLE,
  description: SAMPLE_BANNERALERT_DESCRIPTION,
  actionButtonProps: {
    label: SAMPLE_BANNERALERT_ACTIONBUTTONLABEL,
    onPress: () => console.log('actionButton clicked!'),
  },
  onClose: () => console.log('closeButton clicked!'),
};
