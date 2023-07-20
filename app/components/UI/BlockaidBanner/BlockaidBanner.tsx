import React from 'react';
import { strings } from '../../../../locales/i18n';
import { useTheme } from '@react-navigation/native';
import { AccordionHeaderHorizontalAlignment } from '../../../component-library/components/Accordions/Accordion';
import { AttackType, BlockaidBannerProps } from './BlockaidBanner.types';
import { BannerAlertSeverity } from '../../../component-library/components/Banners/Banner';
import { DEFAULT_BANNERBASE_DESCRIPTION_TEXTVARIANT } from '../../../component-library/components/Banners/Banner/foundation/BannerBase/BannerBase.constants';
import { FlatList } from 'react-native-gesture-handler';
import {
  REASON_DESCRIPTION_I18N_KEY_MAP,
  SUSPICIOUS_TITLED_REQUESTS,
} from './utils';
import { StyleSheet } from 'react-native';
import Accordion from '../../../component-library/components/Accordions/Accordion/Accordion';
import AttributionLink from './AttributionLink';
import BannerAlert from '../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert';
import FontAwesome5Icon from 'react-native-vector-icons/FontAwesome5';
import ListItem from '../../../components/Base/ListItem';
import Text from '../../../component-library/components/Texts/Text/Text';

const getTitle = (attackType: AttackType) => {
  if (SUSPICIOUS_TITLED_REQUESTS.indexOf(attackType) >= 0) {
    return strings('blockaid_banner.suspicious_request_title');
  }
  return strings('blockaid_banner.deceptive_request_title');
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    attributionLink: { color: colors.primary.default },
    shieldIcon: { marginRight: 5, color: colors.primary.default },
  });

const getTitleDescription = (attackType: AttackType) => {
  const title = getTitle(attackType);
  const description = strings(REASON_DESCRIPTION_I18N_KEY_MAP[attackType]);

  return { title, description };
};

const BlockaidBanner = (bannerProps: BlockaidBannerProps) => {
  const { flagType, attackType, features, onToggleShowDetails } = bannerProps;

  const { colors } = useTheme();
  const styles = createStyles(colors);

  const { title, description } = getTitleDescription(attackType);

  const renderAttackDetails = () =>
    features.length <= 0 ? null : (
      <FlatList
        data={features}
        renderItem={({ item }) => (
          <ListItem style={styles}>
            <ListItem.Content style={styles}>
              <ListItem.Icon style={styles}>
                <FontAwesome5Icon name="dot-circle" size={25} />
              </ListItem.Icon>
              <ListItem.Body style={styles}>
                <Text>{item.description}</Text>
              </ListItem.Body>
            </ListItem.Content>
          </ListItem>
        )}
        keyExtractor={(item) => item.title}
      />
    );

  return flagType === 'benign' ? null : (
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
        horizontalAlignment={AccordionHeaderHorizontalAlignment.Start}
      >
        {renderAttackDetails()}
      </Accordion>

      <Text
        variant={DEFAULT_BANNERBASE_DESCRIPTION_TEXTVARIANT}
        data-testid="blockaid-banner-attribution-line"
      >
        <FontAwesome5Icon name="shield-check" style={styles.shieldIcon} />
        {strings('blockaid_banner.attribution', {
          attributionLink: <AttributionLink />,
        })}
      </Text>
    </BannerAlert>
  );
};

export default BlockaidBanner;
