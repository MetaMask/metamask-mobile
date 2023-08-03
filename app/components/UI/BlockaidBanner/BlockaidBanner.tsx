import React from 'react';
import { View } from 'react-native-animatable';

import { captureException } from '@sentry/react-native';

import { strings } from '../../../../locales/i18n';
import { AccordionHeaderHorizontalAlignment } from '../../../component-library/components/Accordions/Accordion';
import Accordion from '../../../component-library/components/Accordions/Accordion/Accordion';
import { BannerAlertSeverity } from '../../../component-library/components/Banners/Banner';
import { DEFAULT_BANNERBASE_DESCRIPTION_TEXTVARIANT } from '../../../component-library/components/Banners/Banner/foundation/BannerBase/BannerBase.constants';
import BannerAlert from '../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert';
import {
  IconColor,
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import Icon from '../../../component-library/components/Icons/Icon/Icon';
import Text from '../../../component-library/components/Texts/Text/Text';
import { useStyles } from '../../../component-library/hooks/useStyles';
import AttributionLink from './AttributionLink';
import {
  ATTRIBUTION_LINE_TEST_ID,
  REASON_DESCRIPTION_I18N_KEY_MAP,
  SUSPICIOUS_TITLED_REQUESTS,
} from './BlockaidBanner.constants';
import styleSheet from './BlockaidBanner.styles';
import { BlockaidBannerProps, FlagType, Reason } from './BlockaidBanner.types';
import { showBlockaidUI } from '../../../util/blockaid';

const getTitle = (reason: Reason): string => {
  if (SUSPICIOUS_TITLED_REQUESTS.indexOf(reason) >= 0) {
    return strings('blockaid_banner.suspicious_request_title');
  }
  return strings('blockaid_banner.deceptive_request_title');
};

const getTitleDescription = (
  reason: Reason,
): { title: string; description: string } => {
  const title = getTitle(reason);
  const description = strings(
    REASON_DESCRIPTION_I18N_KEY_MAP[reason] ||
      REASON_DESCRIPTION_I18N_KEY_MAP[Reason.other],
  );

  return { title, description };
};

const BlockaidBanner = (bannerProps: BlockaidBannerProps) => {
  const { style, flagType, reason, features, onToggleShowDetails } =
    bannerProps;

  const { styles } = useStyles(styleSheet, { style });

  if (!showBlockaidUI()) {
    return null;
  }

  const { title, description } = getTitleDescription(reason);

  if (flagType === FlagType.Benign) {
    return null;
  }

  if (flagType === FlagType.Failed) {
    return (
      <BannerAlert
        severity={BannerAlertSeverity.Warning}
        title={title}
        description={description}
      />
    );
  }

  if (!REASON_DESCRIPTION_I18N_KEY_MAP[reason]) {
    captureException(`BlockaidBannerAlert: Unidentified reason '${reason}'`);
  }

  const renderDetails = () =>
    features.length <= 0 ? null : (
      <View style={styles.details}>
        {features.map((feature, i) => (
          <Text key={`feature-${i}`} style={styles.detailsItem}>
            • {feature}
          </Text>
        ))}
      </View>
    );

  return (
    <BannerAlert
      severity={
        flagType === FlagType.Malicious
          ? BannerAlertSeverity.Error
          : BannerAlertSeverity.Warning
      }
      title={title}
      description={description}
      {...bannerProps}
    >
      <Accordion
        title={strings('blockaid_banner.see_details')}
        onPress={onToggleShowDetails}
        isExpanded={false}
        horizontalAlignment={AccordionHeaderHorizontalAlignment.Start}
      >
        {renderDetails()}
      </Accordion>

      <View style={styles.attributionBase}>
        <View style={styles.attributionItem}>
          <Icon
            name={IconName.SecurityTick}
            size={IconSize.Sm}
            color={IconColor.Primary}
            style={styles.securityTickIcon}
          />
        </View>
        <View style={styles.attributionItem}>
          <Text
            variant={DEFAULT_BANNERBASE_DESCRIPTION_TEXTVARIANT}
            data-testid={ATTRIBUTION_LINE_TEST_ID}
          >
            {strings('blockaid_banner.attribution')}
          </Text>
        </View>
        <View style={styles.attributionItem}>
          <AttributionLink />
        </View>
      </View>
    </BannerAlert>
  );
};

export default BlockaidBanner;
