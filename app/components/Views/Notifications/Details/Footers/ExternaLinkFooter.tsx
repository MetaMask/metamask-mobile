import React from 'react';
import { Linking } from 'react-native';
import Button, {
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { ModalFooterExternalLink } from '../../../../../util/notifications/notification-states/types/NotificationModalDetails';
import useStyles from '../useStyles';

type ExternalLinkFooterProps = ModalFooterExternalLink;

export default function ExternalLinkFooter(props: ExternalLinkFooterProps) {
  const { styles } = useStyles();

  if (!props.externalLink) {
    return null;
  }

  const { externalLinkText, externalLinkUrl } = props.externalLink;

  // TODO - Feature Announcement Links are internal, needs rework
  return (
    <Button
      variant={ButtonVariants.Secondary}
      label={externalLinkText}
      style={styles.ctaBtn}
      onPress={() => Linking.openURL(externalLinkUrl)}
    />
  );
}
