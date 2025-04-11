import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  selectPooledStakingServiceInterruptionBannerEnabledFlag,
  selectStablecoinLendingServiceInterruptionBannerEnabledFlag,
} from '../../../../../selectors/featureFlagController/earnFeatureFlags';
import Banner, {
  BannerVariant,
  BannerAlertSeverity,
} from '../../../../../component-library/components/Banners/Banner';
import Text from '../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../locales/i18n';

const EarnServiceInterruptionBanner = () => {
  const isPooledStakingDown = useSelector(
    selectPooledStakingServiceInterruptionBannerEnabledFlag,
  );
  const isStablecoinLendingDown = useSelector(
    selectStablecoinLendingServiceInterruptionBannerEnabledFlag,
  );

  const bannerTitle = strings('earn.service_interruption_banner.title');
  const impactedExperiences = useMemo(() => {
    const impactedServices = [];

    if (isPooledStakingDown)
      impactedServices.push(
        strings('earn.service_interruption_banner.pooled_staking_service_name'),
      );
    if (isStablecoinLendingDown)
      impactedServices.push(
        strings(
          'earn.service_interruption_banner.stablecoin_lending_service_name',
        ),
      );

    if (!impactedServices.length) return '';
    if (impactedServices.length === 1) return impactedServices[0];

    return impactedServices.join(', ');
  }, [isPooledStakingDown, isStablecoinLendingDown]);

  // Hide banner when there are no service interruptions
  if (!isPooledStakingDown && !isStablecoinLendingDown) return <></>;

  return (
    <Banner
      severity={BannerAlertSeverity.Warning}
      variant={BannerVariant.Alert}
      title={<Text>{bannerTitle}</Text>}
      description={impactedExperiences}
    />
  );
};

export default EarnServiceInterruptionBanner;
