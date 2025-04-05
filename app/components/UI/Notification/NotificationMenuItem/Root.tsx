// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck - Notifications team directory
import React from 'react';
import { TouchableOpacity } from 'react-native';

import { NotificationListStyles } from '../List/styles';

interface NotificationRootProps
  extends Pick<PanGestureHandlerProps, 'simultaneousHandlers'> {
  children: React.ReactNode;
  styles: NotificationListStyles;
  handleOnPress: () => void;
  onDismiss?: () => void;
  isRead?: boolean;
  testID?: string;
}

function NotificationRoot({
  children,
  handleOnPress,
  styles,
  isRead,
  testID,
}: NotificationRootProps) {
  return (
    <TouchableOpacity
      onPress={handleOnPress}
      style={[
        styles.menuItemContainer,
        !isRead ? styles.unreadItemContainer : styles.readItemContainer,
      ]}
      testID={testID}
    >
      {children}
    </TouchableOpacity>
  );
}

export default NotificationRoot;
