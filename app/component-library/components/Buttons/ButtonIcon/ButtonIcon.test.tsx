// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

// Internal dependencies.
import ButtonIcon from './ButtonIcon';
import {
  DEFAULT_BUTTONICON_SIZE,
  DEFAULT_BUTTONICON_ICONCOLOR,
  DEFAULT_BUTTONICON_ICONNAME,
} from './ButtonIcon.constants';

describe('ButtonIcon', () => {
  it('renders the icon button', () => {
    const { getByTestId } = render(
      <ButtonIcon
        iconColor={DEFAULT_BUTTONICON_ICONCOLOR}
        iconName={DEFAULT_BUTTONICON_ICONNAME}
        size={DEFAULT_BUTTONICON_SIZE}
        onPress={jest.fn}
        testID="icon-button"
      />,
    );

    expect(getByTestId('icon-button')).toBeOnTheScreen();
  });

  it('renders with fully rounded corners', () => {
    const { getByTestId } = render(
      <ButtonIcon
        iconColor={DEFAULT_BUTTONICON_ICONCOLOR}
        iconName={DEFAULT_BUTTONICON_ICONNAME}
        size={DEFAULT_BUTTONICON_SIZE}
        onPress={jest.fn}
        testID="rounded-icon-button"
      />,
    );

    const buttonStyle = StyleSheet.flatten(
      getByTestId('rounded-icon-button').props.style,
    );

    expect(buttonStyle.borderRadius).toBe(9999);
  });
});
