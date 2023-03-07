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

// Tokens
export const TOKEN_BANNERALERT_ICONSIZE = IconSize.Lg;

// Mappings
export const ICONNAME_BY_BANNERALERTSEVERITY: IconNameByBannerAlertSeverity = {
  [BannerAlertSeverity.Info]: IconName.Info,
  [BannerAlertSeverity.Success]: IconName.CheckBoxOn,
  [BannerAlertSeverity.Error]: IconName.Danger,
  [BannerAlertSeverity.Warning]: IconName.Danger,
};

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
  actionButtonLabel: SAMPLE_BANNERALERT_ACTIONBUTTONLABEL,
  actionButtonOnPress: () => console.log('actionButton clicked!'),
  onClose: () => console.log('closeButton clicked!'),
};
