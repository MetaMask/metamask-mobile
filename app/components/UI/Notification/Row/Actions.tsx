import React from 'react';
import { Linking } from 'react-native';
import Button, {
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { NOTIFICATION_TEST_ID_TYPES } from './constants';

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
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      testID={NOTIFICATION_TEST_ID_TYPES.NOTIFICATION_ACTION_BUTTON}
      variant={ButtonVariants.Secondary}
      label={link?.linkText || action?.actionText}
      onPress={handleCTAPress}
      style={styles.button}
      endIconName={IconName.Arrow2Upright}
    />
  );
}

export default NotificationActions;
