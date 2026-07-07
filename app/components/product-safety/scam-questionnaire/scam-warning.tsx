import React, { useCallback, useEffect, useState } from 'react';
import { Linking, ScrollView, TouchableOpacity, View } from 'react-native';

import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../component-library/hooks';
import { useTheme } from '../../../util/theme';
import { strings } from '../../../../locales/i18n';
import { METAMASK_SUPPORT_URL } from '../../../constants/urls';
import { PROCEED_DELAY_SECONDS } from './scam-questionnaire.constants';
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

  // Gate the bypass link for a few seconds so the warning can't be dismissed
  // instantly.
  const [secondsRemaining, setSecondsRemaining] = useState(
    PROCEED_DELAY_SECONDS,
  );
  const canProceed = secondsRemaining === 0;

  useEffect(() => {
    if (secondsRemaining === 0) {
      return undefined;
    }
    const intervalId = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(intervalId);
  }, [secondsRemaining]);

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
            name={IconName.Danger}
            size={IconSize.Lg}
            color={colors.error.default}
          />
        </View>
        <Text variant={TextVariant.HeadingLG} style={styles.warningTitle}>
          {strings('scam_questionnaire.warning.title')}
        </Text>
        <View style={styles.warningReason}>
          <Icon
            name={IconName.Flag}
            size={IconSize.Sm}
            color={colors.error.default}
            style={styles.warningReasonIcon}
          />
          <Text variant={TextVariant.BodyMD} style={styles.warningReasonText}>
            {strings('scam_questionnaire.warning.reason_known_scam')}
          </Text>
        </View>
        <View style={styles.warningReason}>
          <Icon
            name={IconName.Refresh}
            size={IconSize.Sm}
            color={colors.error.default}
            style={styles.warningReasonIcon}
          />
          <Text variant={TextVariant.BodyMD} style={styles.warningReasonText}>
            <Text variant={TextVariant.BodyMDBold}>
              {strings(
                'scam_questionnaire.warning.reason_irreversible_emphasis',
              )}
            </Text>{' '}
            {strings('scam_questionnaire.warning.reason_irreversible_detail')}
          </Text>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={canProceed ? onProceed : undefined}
          disabled={!canProceed}
          testID="scam-warning-proceed"
        >
          <Text
            variant={TextVariant.BodySM}
            style={canProceed ? styles.bypassText : styles.bypassTextDisabled}
          >
            {canProceed
              ? strings('scam_questionnaire.warning.proceed_anyway')
              : strings('scam_questionnaire.warning.proceed_anyway_countdown', {
                  seconds: secondsRemaining,
                })}
          </Text>
        </TouchableOpacity>
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
      </View>
    </View>
  );
};
