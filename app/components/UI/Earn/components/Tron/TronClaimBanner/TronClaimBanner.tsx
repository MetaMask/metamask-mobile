import React from 'react';
import { ViewStyle } from 'react-native';
import type { CaipChainId } from '@metamask/utils';
import { strings } from '../../../../../../../locales/i18n';
import Banner, {
  BannerAlertSeverity,
  BannerVariant,
} from '../../../../../../component-library/components/Banners/Banner';
import { Text, TextButton } from '@metamask/design-system-react-native';
import useTronClaim from '../../../hooks/useTronClaim';

interface TronClaimBannerProps {
  amount: string;
  chainId: CaipChainId;
  style?: ViewStyle;
}

const TronClaimBanner = ({ amount, chainId, style }: TronClaimBannerProps) => {
  const { handleClaim, isSubmitting } = useTronClaim({ chainId });

  return (
    <Banner
      severity={BannerAlertSeverity.Success}
      variant={BannerVariant.Alert}
      style={style}
      description={
        <>
          <Text testID="tron-claim-banner">
            {strings('stake.tron.has_claimable_trx', { amount })}
          </Text>
          <TextButton
            testID="tron-claim-banner-button"
            twClassName="self-start"
            onPress={handleClaim}
            isDisabled={isSubmitting}
          >
            {strings('stake.tron.claim_trx')}
          </TextButton>
        </>
      }
    />
  );
};

export default TronClaimBanner;
