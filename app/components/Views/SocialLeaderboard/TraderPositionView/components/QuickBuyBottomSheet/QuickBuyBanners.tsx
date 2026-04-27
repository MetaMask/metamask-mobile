import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import BannerAlert from '../../../../../../component-library/components/Banners/Banner/variants/BannerAlert';
import { BannerAlertSeverity } from '../../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.types';
import { strings } from '../../../../../../../locales/i18n';

export interface QuickBuyBannersProps {
  isHardwareSolanaBlocked: boolean;
  isPriceImpactError: boolean;
  isPriceImpactWarning: boolean;
  formattedPriceImpact: string;
}

const QuickBuyBanners: React.FC<QuickBuyBannersProps> = ({
  isHardwareSolanaBlocked,
  isPriceImpactError,
  isPriceImpactWarning,
  formattedPriceImpact,
}) => {
  if (
    !isHardwareSolanaBlocked &&
    !isPriceImpactError &&
    !isPriceImpactWarning
  ) {
    return null;
  }

  return (
    <Box twClassName="px-4" gap={3}>
      {isHardwareSolanaBlocked && (
        <BannerAlert
          severity={BannerAlertSeverity.Error}
          description={strings('bridge.hardware_wallet_not_supported_solana')}
        />
      )}

      {isPriceImpactError && (
        <BannerAlert
          severity={BannerAlertSeverity.Error}
          title={strings('bridge.price_impact_error_title')}
          description={`${strings('bridge.price_impact_error_description')} (${formattedPriceImpact})`}
        />
      )}

      {isPriceImpactWarning && (
        <BannerAlert
          severity={BannerAlertSeverity.Warning}
          title={strings('bridge.price_impact_warning_title')}
          description={`${strings('bridge.price_impact_warning_description')} (${formattedPriceImpact})`}
        />
      )}
    </Box>
  );
};

export default QuickBuyBanners;
