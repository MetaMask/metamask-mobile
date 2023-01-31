import React from 'react';
import { TouchableOpacity, Image as ImageRN, Platform } from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../../util/theme';
import { BIOMETRY_TYPE } from 'react-native-keychain';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import { createStyles } from './styles';

/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable import/no-commonjs */
const iosFaceId = require('../../../images/ios-face-id.png');
const androidFaceRecognition = require('../../../images/android-face-recognition.png');
const androidIris = require('../../../images/android-iris.png');

type BiometryType = BIOMETRY_TYPE | AUTHENTICATION_TYPE;

interface BiometryButtonProps {
  onPress: () => void;
  hidden: boolean;
  biometryType: BiometryType;
}

const BiometryButton = ({
  onPress,
  hidden,
  biometryType,
}: BiometryButtonProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const renderIcon = (type: BiometryType) => {
    if (Platform.OS === 'ios') {
      if (type === 'TouchID') {
        return (
          <Ionicons
            color={colors.text.default}
            size={28}
            style={styles.fixCenterIcon}
            name="ios-finger-print"
          />
        );
      } else if (type.includes(AUTHENTICATION_TYPE.PASSCODE)) {
        return (
          <Ionicons
            color={colors.text.default}
            size={28}
            style={styles.fixCenterIcon}
            name="ios-lock"
          />
        );
      }
      return <ImageRN style={styles.image} source={iosFaceId} />;
    }

    if (Platform.OS === 'android') {
      if (type === 'Fingerprint') {
        return (
          <MaterialIcon
            color={colors.text.default}
            style={styles.fixCenterIcon}
            size={28}
            name="fingerprint"
          />
        );
      } else if (type === 'Face') {
        return <ImageRN style={styles.image} source={androidFaceRecognition} />;
      } else if (type === 'Iris') {
        return <ImageRN style={styles.image} source={androidIris} />;
      } else if (type.includes(AUTHENTICATION_TYPE.PASSCODE)) {
        return (
          <MaterialIcon
            color={colors.text.default}
            style={styles.fixCenterIcon}
            size={28}
            name="lock"
          />
        );
      }
    }

    return (
      <Ionicons
        color={colors.text.default}
        style={styles.fixCenterIcon}
        size={28}
        name="ios-finger-print"
      />
    );
  };

  if (hidden) return null;

  return (
    <TouchableOpacity hitSlop={styles.hitSlop} onPress={onPress}>
      {renderIcon(biometryType)}
    </TouchableOpacity>
  );
};

export default BiometryButton;
