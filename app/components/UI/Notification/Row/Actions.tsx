import React from 'react';

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
  handleCTAPress: () => void;
}
function NotificationActions({
  link,
  action,
  styles,
  handleCTAPress,
}: NotificationActionsProps) {
  return (
    <Button
      variant={ButtonVariants.Secondary}
      label={
        (link as { linkText?: string })?.linkText ||
        (action as { actionText?: string })?.actionText
      }
      onPress={handleCTAPress}
      style={styles.button}
      endIconName={IconName.Arrow2Right}
    />
  );
}

export default NotificationActions;
