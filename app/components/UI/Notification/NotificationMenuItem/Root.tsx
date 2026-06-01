import React from 'react';
import { ViewStyle } from 'react-native';
import useStyles from '../List/useStyles';
import Pressable from '../../../../component-library/components-temp/Pressable';
interface NotificationRootProps {
  children: React.ReactNode;
  handleOnPress: () => void;
  style?: ViewStyle;
  isRead?: boolean;
  testID?: string;
}

function NotificationRoot({
  children,
  handleOnPress,
  isRead,
  testID,
  style,
}: NotificationRootProps) {
  const { styles } = useStyles();

  return (
    <Pressable
      onPress={handleOnPress}
      style={[
        !isRead ? styles.unreadItemContainer : styles.readItemContainer,
        style,
      ]}
      testID={testID}
    >
      {children}
    </Pressable>
  );
}

export default NotificationRoot;
