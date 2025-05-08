import React, { FunctionComponent } from 'react';
import Banner, {
  BannerAlertSeverity,
  BannerVariant,
} from '../../../component-library/components/Banners/Banner';

export interface SnapUIBannerProps {
  severity: BannerAlertSeverity | undefined;
  title: string;
  children: React.ReactNode;
}

export const SnapUIBanner: FunctionComponent<SnapUIBannerProps> = ({
  children,
  severity,
  title,
}) => (
  <Banner severity={severity} title={title} variant={BannerVariant.Alert}>
    {children}
  </Banner>
);
