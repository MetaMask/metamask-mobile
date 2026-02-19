import React from 'react';
import { View } from 'react-native';
import Modal from 'react-native-modal';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './styles';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';

interface RestrictedSiteModalProps {
  restrictedUrl?: string;
  showModal: boolean;
  onClose: () => void;
}

/**
 * Modal shown when a page load times out, likely due to native Safe Browsing
 * blocking the URL silently (iOS WKWebView or Android WebView).
 */
const RestrictedSiteModal = ({
  restrictedUrl,
  showModal,
  onClose,
}: RestrictedSiteModalProps) => {
  const {
    styles,
    theme: { colors },
  } = useStyles(styleSheet, {});

  if (!showModal) return null;

  return (
    <Modal
      isVisible={showModal}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      style={styles.modal}
      backdropOpacity={0.7}
      backdropColor={colors.background.alternative}
      animationInTiming={300}
      animationOutTiming={300}
      useNativeDriver
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
    >
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Icon
            name={IconName.Warning}
            size={IconSize.Xl}
            color={IconColor.Warning}
          />
        </View>
        <Text variant={TextVariant.HeadingMD} style={styles.title}>
          {strings('restricted_site.title')}
        </Text>
        <Text variant={TextVariant.BodyMD} style={styles.description}>
          {strings('restricted_site.description')}
        </Text>
        {restrictedUrl && (
          <Text
            variant={TextVariant.BodySM}
            style={styles.url}
            numberOfLines={2}
          >
            {restrictedUrl}
          </Text>
        )}
        <Text variant={TextVariant.BodySM} style={styles.explanation}>
          {strings('restricted_site.explanation')}
        </Text>
        <Button
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          label={strings('restricted_site.go_back')}
          onPress={onClose}
        />
      </View>
    </Modal>
  );
};

export default RestrictedSiteModal;
