import React from 'react';
import { Modal, View } from 'react-native';
import { useTheme } from '../../../util/theme';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import { strings } from '../../../../locales/i18n';
import { createStyles } from './index.style';

interface SupportConsentModalProps {
  isVisible: boolean;
  onConsent: () => void;
  onDecline: () => void;
}

const SupportConsentModal: React.FC<SupportConsentModalProps> = ({
  isVisible,
  onConsent,
  onDecline,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onDecline}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.content}>
            <Text
              variant={TextVariant.HeadingMD}
              style={styles.title}
              color={TextColor.Default}
            >
              {strings('support_consent.title')}
            </Text>
            
            <Text
              variant={TextVariant.BodyMD}
              style={styles.description}
              color={TextColor.Alternative}
            >
              {strings('support_consent.description')}
            </Text>

            <View style={styles.buttonContainer}>
              <Button
                variant={ButtonVariants.Secondary}
                size={ButtonSize.Lg}
                onPress={onDecline}
                style={styles.declineButton}
                label={strings('support_consent.decline')}
              />
              
              <Button
                variant={ButtonVariants.Primary}
                size={ButtonSize.Lg}
                onPress={onConsent}
                style={styles.consentButton}
                label={strings('support_consent.consent')}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default SupportConsentModal; 