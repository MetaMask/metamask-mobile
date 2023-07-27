import {
  IconColor,
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';

import { strings } from '../../../../locales/i18n';
import { AccordionHeaderHorizontalAlignment } from '../../../component-library/components/Accordions/Accordion';
import Accordion from '../../../component-library/components/Accordions/Accordion/Accordion';
import { BannerAlertSeverity } from '../../../component-library/components/Banners/Banner';
import { DEFAULT_BANNERBASE_DESCRIPTION_TEXTVARIANT } from '../../../component-library/components/Banners/Banner/foundation/BannerBase/BannerBase.constants';
import BannerAlert from '../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert';
import Icon from '../../../component-library/components/Icons/Icon/Icon';
import Text from '../../../component-library/components/Texts/Text/Text';
import AttributionLink from './AttributionLink';
import {
  AttackType,
  BlockaidBannerProps,
  FlagType,
} from './BlockaidBanner.types';
import {
  ATTRIBUTION_LINE_TEST_ID,
  REASON_DESCRIPTION_I18N_KEY_MAP,
  SUSPICIOUS_TITLED_REQUESTS,
} from './BlockaidBannerConstants';
import { View } from 'react-native-animatable';

const getTitle = (attackType: AttackType) => {
  if (SUSPICIOUS_TITLED_REQUESTS.indexOf(attackType) >= 0) {
    return strings('blockaid_banner.suspicious_request_title');
  }
  return strings('blockaid_banner.deceptive_request_title');
};

const createStyles = () =>
  StyleSheet.create({
    attributionBase: Object.assign({
      height: 24,
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
    } as ViewStyle),
    attributionItem: {
      marginLeft: 4,
    },
    details: { marginLeft: 4 },
    shieldIcon: { marginTop: 4 },
  });

const getTitleDescription = (attackType: AttackType) => {
  const title = getTitle(attackType);
  const description = strings(REASON_DESCRIPTION_I18N_KEY_MAP[attackType]);

  return { title, description };
};

const BlockaidBanner = (bannerProps: BlockaidBannerProps) => {
  const { flagType, attackType, features, onToggleShowDetails } = bannerProps;

  if (flagType === FlagType.benign) {
    return null;
  }

  const styles = createStyles();

  const { title, description } = getTitleDescription(attackType);

  const renderAttackDetails = () =>
    features.length <= 0 ? null : (
      <View style={styles.details}>
        {features.map((feature, i) => (
          <Text key={`feature-${i}`}>• {feature}</Text>
        ))}
      </View>
    );

  return (
    <BannerAlert
      severity={
        flagType === FlagType.malicious
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
        {renderAttackDetails()}
      </Accordion>

      <View style={styles.attributionBase}>
        <View style={styles.attributionItem}>
          <Icon
            name={IconName.Security}
            size={IconSize.Sm}
            color={IconColor.Primary}
            style={styles.shieldIcon}
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
