import React, { ReactNode } from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Alert, { AlertType } from '../../../Base/Alert';
import { useTheme } from '../../../../util/theme';

interface Props {
  /**
   * Warning message to display (Plain text or JSX)
   */
  warningMessage: ReactNode;
  style?: StyleProp<ViewStyle>;
}

const styles = StyleSheet.create({
  icon: {
    paddingTop: 4,
    paddingRight: 8,
  },
});

const WarningMessage = ({ warningMessage, style }: Props) => {
  const { colors } = useTheme();

  return (
    <Alert
      type={AlertType.Warning}
      style={style}
      renderIcon={() => (
        <FontAwesome
          style={styles.icon}
          name={'exclamation-circle'}
          color={colors.warning.default}
          size={18}
        />
      )}
    >
      {warningMessage}
    </Alert>
  );
};

export default WarningMessage;
