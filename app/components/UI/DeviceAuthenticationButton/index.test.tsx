import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import DeviceAuthenticationButton from './DeviceAuthenticationButton';
import { LoginViewSelectors } from '../../Views/Login/LoginView.testIds';

const mockOnPress = jest.fn();

describe('DeviceAuthenticationButton', () => {
  beforeEach(() => {
    mockOnPress.mockClear();
  });

  it('hides when hidden is true', () => {
    const { toJSON } = render(
      <DeviceAuthenticationButton onPress={mockOnPress} hidden />,
    );

    expect(toJSON()).toBeNull();
  });

  it('renders button with device authentication icon when visible', () => {
    const { getByTestId } = render(
      <DeviceAuthenticationButton onPress={mockOnPress} hidden={false} />,
    );

    expect(getByTestId(LoginViewSelectors.BIOMETRY_BUTTON)).toBeDefined();
    expect(getByTestId(LoginViewSelectors.DEVICE_AUTHENTICATION_ICON)).toBeDefined();
  });

  it('calls onPress when pressed', () => {
    const { getByTestId } = render(
      <DeviceAuthenticationButton onPress={mockOnPress} hidden={false} />,
    );

    fireEvent.press(getByTestId(LoginViewSelectors.BIOMETRY_BUTTON));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });
});
