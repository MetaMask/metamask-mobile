import React from 'react';
import {
  BannerAlert,
  BannerAlertSeverity,
  Box,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';

export interface QuickBuyBannersProps {
  isHardwareSolanaBlocked: boolean;
}

const QuickBuyBanners: React.FC<QuickBuyBannersProps> = ({
  isHardwareSolanaBlocked,
}) => {
  if (!isHardwareSolanaBlocked) {
    return null;
  }

  return (
    <Box twClassName="px-4" gap={3}>
      {isHardwareSolanaBlocked && (
        <BannerAlert
          severity={BannerAlertSeverity.Danger}
          description={strings('bridge.hardware_wallet_not_supported_solana')}
        />
      )}
    </Box>
  );
};

export default QuickBuyBanners;
