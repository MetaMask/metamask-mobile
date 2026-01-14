import React from 'react';
import { render } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { BIOMETRY_TYPE } from 'react-native-keychain';
import BiometryButton from './BiometryButton';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import { LoginViewSelectors } from '../../Views/Login/LoginView.testIds';

jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Platform: { OS: 'ios' },
}));

const mockOnPress = jest.fn();

describe('BiometryButton', () => {
  it('should hide when hidden is true', () => {
    const { toJSON } = render(
      <BiometryButton
        onPress={mockOnPress}
        hidden
        biometryType={BIOMETRY_TYPE.FACE}
      />,
    );

    expect(toJSON()).toBeNull();
  });

  describe('ios', () => {
    beforeEach(() => {
      Platform.OS = 'ios';
    });

    it('should render touch id icon', () => {
      const { getByTestId } = render(
        <BiometryButton
          onPress={mockOnPress}
          hidden={false}
          biometryType={BIOMETRY_TYPE.TOUCH_ID}
        />,
      );

      const touchIdIcon = getByTestId(LoginViewSelectors.IOS_TOUCH_ID_ICON);
      expect(touchIdIcon).toBeDefined();
    });

    it('should render passcode icon', () => {
      const { getByTestId } = render(
        <BiometryButton
          onPress={mockOnPress}
          hidden={false}
          biometryType={AUTHENTICATION_TYPE.PASSCODE}
        />,
      );

      const passcodeIcon = getByTestId(LoginViewSelectors.IOS_PASSCODE_ICON);
      expect(passcodeIcon).toBeDefined();
    });

    it('should render fallback face id icon', () => {
      const { getByTestId } = render(
        <BiometryButton
          onPress={mockOnPress}
          hidden={false}
          biometryType={AUTHENTICATION_TYPE.UNKNOWN}
        />,
      );

      const fallbackFaceIdIcon = getByTestId(
        LoginViewSelectors.IOS_FACE_ID_ICON,
      );
      expect(fallbackFaceIdIcon).toBeDefined();
    });
  });

  describe('android', () => {
    beforeEach(() => {
      Platform.OS = 'android';
    });

    it('should render fingerprint icon', () => {
      const { getByTestId } = render(
        <BiometryButton
          onPress={mockOnPress}
          hidden={false}
          biometryType={BIOMETRY_TYPE.FINGERPRINT}
        />,
      );

      const fingerprintIcon = getByTestId(
        LoginViewSelectors.ANDROID_FINGERPRINT_ICON,
      );
      expect(fingerprintIcon).toBeDefined();
    });

    it('should render face id icon', () => {
      const { getByTestId } = render(
        <BiometryButton
          onPress={mockOnPress}
          hidden={false}
          biometryType={BIOMETRY_TYPE.FACE}
        />,
      );

      const faceIdIcon = getByTestId(LoginViewSelectors.ANDROID_FACE_ID_ICON);
      expect(faceIdIcon).toBeDefined();
    });

    it('should render iris icon', () => {
      const { getByTestId } = render(
        <BiometryButton
          onPress={mockOnPress}
          hidden={false}
          biometryType={BIOMETRY_TYPE.IRIS}
        />,
      );

      const irisIcon = getByTestId(LoginViewSelectors.ANDROID_IRIS_ICON);
      expect(irisIcon).toBeDefined();
    });

    it('should render passcode icon', () => {
      const { getByTestId } = render(
        <BiometryButton
          onPress={mockOnPress}
          hidden={false}
          biometryType={AUTHENTICATION_TYPE.PASSCODE}
        />,
      );

      const passcodeIcon = getByTestId(
        LoginViewSelectors.ANDROID_PASSCODE_ICON,
      );
      expect(passcodeIcon).toBeDefined();
    });
  });

  it('should render fallback fingerprint icon', () => {
    const { getByTestId } = render(
      <BiometryButton
        onPress={mockOnPress}
        hidden={false}
        biometryType={AUTHENTICATION_TYPE.UNKNOWN}
      />,
    );

    const fallbackFingerprintIcon = getByTestId(
      LoginViewSelectors.FALLBACK_FINGERPRINT_ICON,
    );
    expect(fallbackFingerprintIcon).toBeDefined();
  });
});
