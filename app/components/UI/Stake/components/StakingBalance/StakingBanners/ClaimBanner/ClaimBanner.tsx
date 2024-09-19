import React from 'react';
import Banner, {
  BannerAlertSeverity,
  BannerVariant,
} from '../../../../../../../component-library/components/Banners/Banner';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../../../locales/i18n';
import Button, {
  ButtonVariants,
} from '../../../../../../../component-library/components/Buttons/Button';
import useTooltipModal from '../../../../../../hooks/useTooltipModal';

interface StakeBannerProps {
  claimableAmount: string;
}

const ClaimBanner = ({ claimableAmount }: StakeBannerProps) => {
  const { openTooltipModal } = useTooltipModal();

  const onClaimPress = () => openTooltipModal('TODO', 'Connect to claim flow');

  return (
    <Banner
      severity={BannerAlertSeverity.Success}
      variant={BannerVariant.Alert}
      description={
        <>
          <Text>
            {strings('stake.bannerText.has_claimable_eth', {
              amountEth: claimableAmount,
            })}
          </Text>
          <Button
            variant={ButtonVariants.Link}
            width={100}
            label={
              <Text
                variant={TextVariant.BodyMDMedium}
                color={TextColor.Primary}
              >
                {strings('stake.claim')} ETH
              </Text>
            }
            onPress={onClaimPress}
          />
        </>
      }
    />
  );
};

export default ClaimBanner;
