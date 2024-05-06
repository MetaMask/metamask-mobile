import React from 'react';
import { Linking } from 'react-native';
import Button, {
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';
import { IconName } from '../../../../component-library/components/Icons/Icon';

interface NotificationActionsProps {
  link?: {
    linkText: string;
    linkUrl: string;
    isExternal: boolean;
  };
  action?: {
    actionText: string;
    actionUrl: string;
    isExternal: boolean;
  };
  styles: any;
}

function NotificationActions({
  action,
  link,
  styles,
}: NotificationActionsProps) {
  function handleCTAPress() {
    if (link?.linkUrl) {
      return Linking.openURL(link.linkUrl);
    }
  }

  return (
    <Button
      testID="notification-actions-button"
      variant={ButtonVariants.Secondary}
      label={link?.linkText || action?.actionText}
      onPress={handleCTAPress}
      style={styles.button}
      endIconName={IconName.Arrow2Upright}
    />
  );
}

export default NotificationActions;
