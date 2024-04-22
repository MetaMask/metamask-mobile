import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
interface NotificationRootProps {
  children: React.ReactNode;
  styles: StyleSheet.NamedStyles<any>;
  handleOnPress: () => void;
}

function NotificationRoot({
  children,
  handleOnPress,
  styles,
}: NotificationRootProps) {
  return (
    <TouchableOpacity onPress={handleOnPress} style={styles.wrapper}>
      {children}
    </TouchableOpacity>
  );
}

export default NotificationRoot;
