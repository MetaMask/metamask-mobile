// import Text from '../../../../../../component-library/components/Texts/Text';

import React, { ReactNode } from 'react';
import Accordion from '../../../component-library/components/Accordions/Accordion/Accordion';
import BannerAlert from '../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert';
import { BannerAlertSeverity } from '../../../component-library/components/Banners/Banner';
import { BlockaidBannerProps } from './BlockaidBanner.types';
import { DEFAULT_BANNERBASE_DESCRIPTION_TEXTVARIANT } from '../../../component-library/components/Banners/Banner/foundation/BannerBase/BannerBase.constants';
import Text from '../../../component-library/components/Texts/Text/Text';

const BlockaidBanner = (bannerProps: BlockaidBannerProps) => {
  const { flagType, attackType, onToggleShowDetails, attackDetails } =
    bannerProps;
  let title = 'This is a deceptive request';
  let description;

  switch (attackType) {
    case 'raw_signature_farming':
      title = 'This is a suspicious request';
      description = 'If you approve this request, you might lose your assets.';
      break;
    case 'approval_farming':
    case 'set_approval_for_all_farming':
    case 'permit_farming':
      description =
        'If you approve this request, a third party known for scams might take all your assets.';
      break;
    case 'transfer_farming':
    case 'transfer_from_farming':
    case 'raw_native_token_transfer':
      description =
        'If you approve this request, a third party known for scams will take all your assets.';
      break;
    case 'seaport_farming':
      description =
        'If you approve this request, someone can steal your assets listed on OpenSea.';
      break;
    case 'blur_farming':
      description =
        'If you approve this request, someone can steal your assets listed on Blur.';
      break;
    case 'unfair_trade':
    default:
      description = 'If you approve this request, you might lose your assets.';
      break;
  }

  const renderAttackDetails = () =>
    typeof attackDetails === 'string' ? (
      <Text variant={DEFAULT_BANNERBASE_DESCRIPTION_TEXTVARIANT}>
        {attackDetails}
      </Text>
    ) : (
      attackDetails
    );

  return (
    <BannerAlert
      severity={
        flagType === 'malicious'
          ? BannerAlertSeverity.Error
          : BannerAlertSeverity.Warning
      }
      title={title}
      description={description}
      {...bannerProps}
    >
      <Accordion
        title="See details"
        onPress={onToggleShowDetails}
        isExpanded={false}
      >
        {renderAttackDetails()}
      </Accordion>
    </BannerAlert>
  );
};

export default BlockaidBanner;
