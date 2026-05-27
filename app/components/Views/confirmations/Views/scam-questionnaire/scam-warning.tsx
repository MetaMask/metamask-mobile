import React, { useCallback } from 'react';
import { Linking, ScrollView, TouchableOpacity, View } from 'react-native';

import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../../../component-library/hooks';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import { METAMASK_SUPPORT_URL } from '../../../../../constants/urls';
import styleSheet from './scam-questionnaire.styles';

export interface ScamWarningProps {
  onStop: () => void;
  onContactSupport: () => void;
  onProceed: () => void;
}

export const ScamWarning: React.FC<ScamWarningProps> = ({
  onStop,
  onContactSupport,
  onProceed,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const { colors } = useTheme();

  const handleContactSupport = useCallback(() => {
    onContactSupport();
    Linking.openURL(METAMASK_SUPPORT_URL);
  }, [onContactSupport]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.warningIconBadge}>
          <Icon
            name={IconName.Warning}
            size={IconSize.Xl}
            color={colors.error.default}
          />
        </View>
        <Text variant={TextVariant.HeadingLG} style={styles.warningTitle}>
          {strings('scam_questionnaire.warning.title')}
        </Text>
        <Text variant={TextVariant.BodyMD} style={styles.warningBody}>
          {strings('scam_questionnaire.warning.body')}
        </Text>
      </ScrollView>
      <View style={styles.footer}>
        <Button
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          isDanger
          onPress={onStop}
          label={strings('scam_questionnaire.warning.stop_payment')}
          style={styles.warningPrimaryButton}
          testID="scam-warning-stop"
        />
        <Button
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          onPress={handleContactSupport}
          label={strings('scam_questionnaire.warning.contact_support')}
          style={styles.warningSecondaryButton}
          testID="scam-warning-contact-support"
        />
        <TouchableOpacity onPress={onProceed} testID="scam-warning-proceed">
          <Text variant={TextVariant.BodySM} style={styles.bypassText}>
            {strings('scam_questionnaire.warning.proceed_anyway')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
