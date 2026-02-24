import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import DeviceAuthenticationButton from './DeviceAuthenticationButton';
import { LoginViewSelectors } from '../../Views/Login/LoginView.testIds';
import { ButtonIconSize, IconName } from '@metamask/design-system-react-native';

const mockOnPress = jest.fn();

describe('DeviceAuthenticationButton', () => {
  beforeEach(() => {
    mockOnPress.mockClear();
  });

  it('hides when hidden is true', () => {
    const { toJSON } = render(
      <DeviceAuthenticationButton
        iconName={IconName.SecurityKey}
        size={ButtonIconSize.Md}
        onPress={mockOnPress}
        hidden
      />,
    );

    expect(toJSON()).toBeNull();
  });

  it('renders button with device authentication icon when visible', () => {
    const { getByTestId } = render(
      <DeviceAuthenticationButton
        iconName={IconName.SecurityKey}
        size={ButtonIconSize.Md}
        onPress={mockOnPress}
        hidden={false}
      />,
    );

    expect(
      getByTestId(LoginViewSelectors.DEVICE_AUTHENTICATION_ICON),
    ).toBeOnTheScreen();
  });

  it('calls onPress when pressed', () => {
    const { getByTestId } = render(
      <DeviceAuthenticationButton
        iconName={IconName.SecurityKey}
        size={ButtonIconSize.Md}
        onPress={mockOnPress}
        hidden={false}
      />,
    );

    fireEvent.press(getByTestId(LoginViewSelectors.DEVICE_AUTHENTICATION_ICON));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });
});
