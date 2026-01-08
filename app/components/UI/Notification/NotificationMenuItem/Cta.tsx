import React, { useCallback } from 'react';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  IconName,
} from '@metamask/design-system-react-native';
import { NotificationMenuItem } from '../../../../util/notifications/notification-states/types/NotificationMenuItem';
import AppConstants from '../../../../core/AppConstants';
import SharedDeeplinkManager from '../../../../core/DeeplinkManager/DeeplinkManager';
import { Linking } from 'react-native';

type NotificationCtaProps = Pick<NotificationMenuItem, 'cta'> & {
  onClick: () => void;
};

function NotificationCta({ cta, onClick }: NotificationCtaProps) {
  const handleClick = useCallback(() => {
    if (!cta?.link) {
      return;
    }

    try {
      onClick();

      // Handle deeplinks
      if (cta.link.includes(AppConstants.MM_IO_UNIVERSAL_LINK_HOST)) {
        SharedDeeplinkManager.parse(cta.link, {
          origin: AppConstants.DEEPLINKS.ORIGIN_DEEPLINK,
        });
        return;
      }

      // Fallback to native link opening
      Linking.openURL(cta.link);
    } catch (e) {
      console.warn(`Failed to open NotificationCTA link ${cta.link}`, e);
    }
  }, [cta?.link, onClick]);

  if (!cta?.content || !cta?.link) {
    return null;
  }

  return (
    <Button
      variant={ButtonVariant.Secondary}
      size={ButtonSize.Md}
      isFullWidth
      endIconName={IconName.Arrow2UpRight}
      onPress={handleClick}
    >
      {cta.content}
    </Button>
  );
}

export default NotificationCta;
