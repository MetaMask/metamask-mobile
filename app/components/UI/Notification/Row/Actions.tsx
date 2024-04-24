import React from 'react';
import { Linking } from 'react-native';
import Button, {
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import SharedDeeplinkManager from '../../../../core/DeeplinkManager/SharedDeeplinkManager';
import AppConstants from '../../../../core/AppConstants';

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

    if (action?.actionUrl) {
      // const handledByDeeplink = SharedDeeplinkManager.parse(action.actionUrl, {
      //   origin: AppConstants.DEEPLINKS.ORIGIN_NOTIFICATION,
      //   // TODO: Check is pop is still valid.
      //   onHandled: () => (navigation as any).pop(2),
      // });
    }

    // return handledByDeeplink;
  }

  return (
    <Button
      variant={ButtonVariants.Secondary}
      label={link?.linkText || action?.actionText}
      onPress={handleCTAPress}
      style={styles.button}
      endIconName={IconName.Arrow2Upright}
    />
  );
}

export default NotificationActions;
