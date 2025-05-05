import React from 'react';
import { TouchableOpacity, Image as ImageRN, Platform } from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../../util/theme';
import { BIOMETRY_TYPE } from 'react-native-keychain';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import { createStyles } from './styles';
import { LoginViewSelectors } from '../../../../e2e/selectors/wallet/LoginView.selectors';

/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable import/no-commonjs */
const iosFaceId = require('../../../images/ios-face-id.png');
const androidFaceRecognition = require('../../../images/android-face-recognition.png');
const androidIris = require('../../../images/android-iris.png');

type BiometryType = BIOMETRY_TYPE | AUTHENTICATION_TYPE | string | null;

interface BiometryButtonProps {
  onPress: () => void;
  hidden: boolean;
  biometryType: BiometryType | null;
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
      if (type === BIOMETRY_TYPE.TOUCH_ID) {
        return (
          <Ionicons
            color={colors.text.default}
            size={28}
            style={styles.fixCenterIcon}
            name="finger-print"
            testID={LoginViewSelectors.IOS_TOUCH_ID_ICON}
          />
        );
      } else if (type?.includes(AUTHENTICATION_TYPE.PASSCODE)) {
        return (
          <Ionicons
            color={colors.text.default}
            size={28}
            style={styles.fixCenterIcon}
            name="lock"
            testID={LoginViewSelectors.IOS_PASSCODE_ICON}
          />
        );
      }
      return (
        <ImageRN
          style={styles.image}
          source={iosFaceId}
          testID={LoginViewSelectors.IOS_FACE_ID_ICON}
        />
      );
    }

    if (Platform.OS === 'android') {
      if (type === BIOMETRY_TYPE.FINGERPRINT) {
        return (
          <MaterialIcon
            color={colors.text.default}
            style={styles.fixCenterIcon}
            size={28}
            name="fingerprint"
            testID={LoginViewSelectors.ANDROID_FINGERPRINT_ICON}
          />
        );
      } else if (type === BIOMETRY_TYPE.FACE) {
        return (
          <ImageRN
            style={styles.image}
            source={androidFaceRecognition}
            testID={LoginViewSelectors.ANDROID_FACE_ID_ICON}
          />
        );
      } else if (type === BIOMETRY_TYPE.IRIS) {
        return (
          <ImageRN
            style={styles.image}
            source={androidIris}
            testID={LoginViewSelectors.ANDROID_IRIS_ICON}
          />
        );
      } else if (type?.includes(AUTHENTICATION_TYPE.PASSCODE)) {
        return (
          <MaterialIcon
            color={colors.text.default}
            style={styles.fixCenterIcon}
            size={28}
            name="lock"
            testID={LoginViewSelectors.ANDROID_PASSCODE_ICON}
          />
        );
      }
    }

    return (
      <Ionicons
        color={colors.text.default}
        style={styles.fixCenterIcon}
        size={28}
        name="finger-print"
        testID={LoginViewSelectors.FALLBACK_FINGERPRINT_ICON}
      />
    );
  };

  if (hidden) return null;

  return (
    <TouchableOpacity
      testID={LoginViewSelectors.BIOMETRY_BUTTON}
      hitSlop={styles.hitSlop}
      onPress={onPress}
    >
      {biometryType ? renderIcon(biometryType) : null}
    </TouchableOpacity>
  );
};

export default BiometryButton;
