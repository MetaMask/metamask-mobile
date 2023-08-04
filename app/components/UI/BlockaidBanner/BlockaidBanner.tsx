// import Text from '../../../../../../component-library/components/Texts/Text';

import React from 'react';
import Accordion from '../../../component-library/components/Accordions/Accordion/Accordion';
import BannerAlert from '../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert';
import { BannerAlertSeverity } from '../../../component-library/components/Banners/Banner';
import { BlockaidBannerProps } from './BlockaidBanner.types';
import { DEFAULT_BANNERBASE_DESCRIPTION_TEXTVARIANT } from '../../../component-library/components/Banners/Banner/foundation/BannerBase/BannerBase.constants';
import Text from '../../../component-library/components/Texts/Text/Text';
import { strings } from '../../../../locales/i18n';
import { Linking, StyleSheet } from 'react-native';
import { useTheme } from '@react-navigation/native';
import FontAwesome5Icon from 'react-native-vector-icons/FontAwesome5';

const createStyles = (colors: any) =>
  StyleSheet.create({
    attributionLink: { color: colors.primary.default },
    shieldIcon: { marginRight: 5, color: colors.primary.default },
    accordionHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      backgroundColor: colors.transparent,
    },
  });

const BlockaidBanner = (bannerProps: BlockaidBannerProps) => {
  const { flagType, attackType, onToggleShowDetails, attackDetails } =
    bannerProps;
  let title = strings('blockaid_banner.title');
  let description;

  switch (attackType) {
    case 'raw_signature_farming':
      title = strings('blockaid_banner.raw_signature_farming_title');
      description = strings(
        'blockaid_banner.raw_signature_farming_description',
      );
      break;
    case 'approval_farming':
    case 'set_approval_for_all_farming':
    case 'permit_farming':
      description = strings('blockaid_banner.approval_farming_description');
      break;
    case 'transfer_farming':
    case 'transfer_from_farming':
    case 'raw_native_token_transfer':
      description = strings('blockaid_banner.transfer_farming_description');
      break;
    case 'seaport_farming':
      description = strings('blockaid_banner.seaport_farming_description');
      break;
    case 'blur_farming':
      description = strings('blockaid_banner.blur_farming_description');
      break;
    case 'unfair_trade':
    default:
      description = strings('blockaid_banner.unfair_trade_description');
      break;
  }

  const { colors } = useTheme();
  const styles = createStyles(colors);

  const renderAttackDetails = () =>
    typeof attackDetails === 'string' ? (
      <Text variant={DEFAULT_BANNERBASE_DESCRIPTION_TEXTVARIANT}>
        {attackDetails}
      </Text>
    ) : (
      attackDetails
    );

  const renderAttributionLink = () => {
    const link = (
      <Text
        suppressHighlighting
        style={styles.attributionLink}
        variant={DEFAULT_BANNERBASE_DESCRIPTION_TEXTVARIANT}
        onPress={() => {
          Linking.openURL(strings('blockaid_banner.attribution_link'));
        }}
      >
        {strings('blockaid_banner.attribution_link_name')}
      </Text>
    );

    return link;
  };

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

      <Text
        variant={DEFAULT_BANNERBASE_DESCRIPTION_TEXTVARIANT}
        data-testid="blockaid-banner-attribution-line"
      >
        <FontAwesome5Icon name="shield-check" style={styles.shieldIcon} />
        {strings('blockaid_banner.attribution', {
          attributionLink: renderAttributionLink(),
        })}
      </Text>
    </BannerAlert>
  );
};

export default BlockaidBanner;
