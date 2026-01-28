import React from 'react';
import { TouchableOpacity, Image as ImageRN, Platform } from 'react-native';
import { useTheme } from '../../../util/theme';
import { BIOMETRY_TYPE } from 'react-native-keychain';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import { createStyles } from './styles';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../component-library/components/Icons/Icon';
import { LoginViewSelectors } from '../../Views/Login/LoginView.testIds';

/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable import/no-commonjs */
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
          <Icon
            color={IconColor.Default}
            size={IconSize.Lg}
            style={styles.fixCenterIcon}
            name={IconName.Fingerprint}
            testID={LoginViewSelectors.IOS_TOUCH_ID_ICON}
          />
        );
      } else if (type?.includes(AUTHENTICATION_TYPE.PASSCODE)) {
        return (
          <Icon
            color={IconColor.Default}
            size={IconSize.Lg}
            style={styles.fixCenterIcon}
            name={IconName.Lock}
            testID={LoginViewSelectors.IOS_PASSCODE_ICON}
          />
        );
      }
      return (
        <Icon
          color={IconColor.Default}
          size={IconSize.Lg}
          style={styles.fixCenterIcon}
          name={IconName.FaceId}
          testID={LoginViewSelectors.IOS_FACE_ID_ICON}
        />
      );
    }

    if (Platform.OS === 'android') {
      if (type === BIOMETRY_TYPE.FINGERPRINT) {
        return (
          <Icon
            color={IconColor.Default}
            style={styles.fixCenterIcon}
            size={IconSize.Lg}
            name={IconName.Fingerprint}
            testID={LoginViewSelectors.ANDROID_FINGERPRINT_ICON}
          />
        );
      } else if (type === BIOMETRY_TYPE.FACE) {
        return (
          <Icon
            color={IconColor.Default}
            style={styles.fixCenterIcon}
            size={IconSize.Lg}
            name={IconName.FaceId}
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
          <Icon
            color={IconColor.Default}
            style={styles.fixCenterIcon}
            size={IconSize.Lg}
            name={IconName.Lock}
            testID={LoginViewSelectors.ANDROID_PASSCODE_ICON}
          />
        );
      }
    }

    return (
      <Icon
        color={IconColor.Default}
        style={styles.fixCenterIcon}
        size={IconSize.Lg}
        name={IconName.Fingerprint}
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
