import React, { useCallback } from 'react';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  IconName,
} from '@metamask/design-system-react-native';
import { NotificationMenuItem } from '../../../../util/notifications/notification-states/types/NotificationMenuItem';
import AppConstants from '../../../../core/AppConstants';
import SharedDeeplinkManager from '../../../../core/DeeplinkManager/SharedDeeplinkManager';
import { Linking } from 'react-native';

type NotificationCtaProps = Pick<NotificationMenuItem, 'cta'>;

function NotificationCta(props: NotificationCtaProps) {
  const handleClick = useCallback(() => {
    if (!props.cta?.link) {
      return;
    }

    try {
      // Handle deeplinks
      if (props.cta.link.includes(AppConstants.MM_IO_UNIVERSAL_LINK_HOST)) {
        SharedDeeplinkManager.parse(props.cta.link, {
          origin: AppConstants.DEEPLINKS.ORIGIN_DEEPLINK,
        });
        return;
      }

      // Fallback to native link opening
      Linking.openURL(props.cta.link);
    } catch (e) {
      console.warn(`Failed to open NotificationCTA link ${props.cta.link}`, e);
    }
  }, [props.cta?.link]);

  if (!props.cta?.content || !props.cta?.link) {
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
      {props.cta.content}
    </Button>
  );
}

export default NotificationCta;
