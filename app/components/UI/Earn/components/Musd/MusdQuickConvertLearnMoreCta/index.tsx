import React, { useCallback } from 'react';
import { View, Image } from 'react-native';
import stylesheet from './MusdQuickConvertLearnMoreCta.styles';
import { useStyles } from '../../../../../hooks/useStyles';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import musdIcon from '../../../../../../images/musd-icon-no-background-2x.png';
import { strings } from '../../../../../../../locales/i18n';
import useTooltipModal from '../../../../../hooks/useTooltipModal';
import { MUSD_APY } from '../../../constants/musd';

export const MUSD_QUICK_CONVERT_LEARN_MORE_CTA_TEST_ID =
  'musd-quick-convert-learn-more-cta';

const MusdQuickConvertLearnMoreCta = () => {
  const { styles } = useStyles(stylesheet, {});
  const { openTooltipModal } = useTooltipModal();

  const handleLearnMorePress = useCallback(() => {
    openTooltipModal(
      strings('earn.musd_conversion.tooltip_title'),
      strings('earn.musd_conversion.tooltip_content', { apy: MUSD_APY }),
    );
  }, [openTooltipModal]);

  return (
    <View
      style={styles.container}
      testID={MUSD_QUICK_CONVERT_LEARN_MORE_CTA_TEST_ID}
    >
      <Image source={musdIcon} style={styles.musdIcon} />
      <View style={styles.textContainer}>
        <Text variant={TextVariant.BodyMDMedium}>
          {strings('earn.musd_conversion.convert_to_musd')}
        </Text>
        <Text>
          <Text
            variant={TextVariant.BodySMMedium}
            color={TextColor.Alternative}
          >
            {strings('earn.musd_conversion.cta_body_earn_apy', {
              apy: MUSD_APY,
            })}{' '}
          </Text>
          <Text
            variant={TextVariant.BodySMMedium}
            color={TextColor.Primary}
            onPress={handleLearnMorePress}
          >
            {strings('earn.musd_conversion.learn_more')}
          </Text>
        </Text>
      </View>
    </View>
  );
};

export default MusdQuickConvertLearnMoreCta;
