import React from 'react';
import { ViewStyle } from 'react-native';
import TouchableOpacity from '../../../Base/TouchableOpacity';
import useStyles from '../List/useStyles';
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
    <TouchableOpacity
      onPress={handleOnPress}
      style={[
        !isRead ? styles.unreadItemContainer : styles.readItemContainer,
        style,
      ]}
      testID={testID}
    >
      {children}
    </TouchableOpacity>
  );
}

export default NotificationRoot;
