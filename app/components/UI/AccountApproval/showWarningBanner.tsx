import React from 'react';
import { View } from 'react-native';
import BannerAlert from '../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert';
import { BannerAlertSeverity } from '../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.types';
import { strings } from '../../../../locales/i18n';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import createStyles from './styles';
import { useTheme } from '../../../util/theme';
import Accordion from '../../../component-library/components/Accordions/Accordion/Accordion';
import Icon from '../../../component-library/components/Icons/Icon/Icon';
import {
  IconColor,
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import { AccordionHeaderHorizontalAlignment } from '../../../component-library/components/Accordions/Accordion';

interface Props {
  onLearnMore: () => void;
  descriptionArray: string[];
}

const ShowWarningBanner = ({ onLearnMore, descriptionArray }: Props) => {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);

  const descriptionText = (
    <Text variant={TextVariant.BodyMD} style={styles.descriptionText}>
      {strings('accounts.deceptive_site_desc')}{' '}
      <Text color={TextColor.Info} onPress={onLearnMore}>
        {strings('accounts.learn_more')}
      </Text>
    </Text>
  );

  return (
    <BannerAlert
      severity={BannerAlertSeverity.Error}
      title={strings('accounts.deceptive_site_ahead')}
      description={descriptionText}
      style={styles.bottom}
    >
      <Accordion
        title={strings('blockaid_banner.see_details')}
        isExpanded={false}
        style={styles.seeDetails}
        horizontalAlignment={AccordionHeaderHorizontalAlignment.Start}
      >
        <Text variant={TextVariant.BodySMBold} style={styles.headerText}>
          {strings('accounts.potential_threat')}
        </Text>
        <View style={styles.details}>
          {descriptionArray?.map((value, i) => (
            <Text
              key={`value-${i}`}
              variant={TextVariant.BodySM}
              style={styles.detailsItem}
            >
              • {value}
            </Text>
          ))}
        </View>
      </Accordion>
      <View style={styles.advisoryContainer}>
        <View style={styles.attributionItem}>
          <Icon
            name={IconName.SecurityTick}
            size={IconSize.Sm}
            color={IconColor.Primary}
            style={styles.securityTickIcon}
          />
        </View>
        <View style={styles.attributionItem}>
          <Text variant={TextVariant.BodySM} style={styles.advisoryText}>
            {strings('accounts.advisory_by')}
          </Text>
        </View>
      </View>
    </BannerAlert>
  );
};

export default ShowWarningBanner;
