// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// External dependencies.
import { IconName } from '../../Icons/Icon';
import { mockTheme } from '../../../../util/theme';

// Internal dependencies.
import ButtonIcon from './ButtonIcon';
import {
  DEFAULT_BUTTONICON_SIZE,
  DEFAULT_BUTTONICON_ICONCOLOR,
  DEFAULT_BUTTONICON_ICONNAME,
} from './ButtonIcon.constants';
import { ButtonIconSizes } from './ButtonIcon.types';

describe('ButtonIcon', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <ButtonIcon
        iconColor={DEFAULT_BUTTONICON_ICONCOLOR}
        iconName={DEFAULT_BUTTONICON_ICONNAME}
        size={DEFAULT_BUTTONICON_SIZE}
        onPress={jest.fn}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render with default props', () => {
    const { getByLabelText, getByRole } = render(
      <ButtonIcon iconName={DEFAULT_BUTTONICON_ICONNAME} />,
    );
    const icon = getByLabelText(`icon-${DEFAULT_BUTTONICON_ICONNAME}`);
    const button = getByRole('button');
    expect(button).toBeTruthy();
    expect(icon).toBeTruthy();
    expect(icon.props.name).toBe(DEFAULT_BUTTONICON_ICONNAME);
    expect(icon.props.color).toBe(mockTheme.colors.icon.default);
    expect(button.props.style.height.toString()).toBe(DEFAULT_BUTTONICON_SIZE);
  });

  it('should call onPress when pressed', () => {
    const onPressMock = jest.fn();
    const { getByRole } = render(
      <ButtonIcon iconName={IconName.Add} onPress={onPressMock} />,
    );
    const button = getByRole('button');

    fireEvent.press(button);
    expect(onPressMock).toHaveBeenCalled();
  });

  it('should not call onPress when disabled', () => {
    const onPressMock = jest.fn();
    const { getByRole } = render(
      <ButtonIcon iconName={IconName.Add} onPress={onPressMock} isDisabled />,
    );
    const button = getByRole('button');

    fireEvent.press(button);
    expect(onPressMock).not.toHaveBeenCalled();
  });

  it('should call onPressIn and onPressOut', () => {
    const onPressInMock = jest.fn();
    const onPressOutMock = jest.fn();
    const { getByRole } = render(
      <ButtonIcon
        iconName={IconName.Add}
        onPressIn={onPressInMock}
        onPressOut={onPressOutMock}
      />,
    );
    const button = getByRole('button');

    fireEvent(button, 'pressIn');
    expect(onPressInMock).toHaveBeenCalled();

    fireEvent(button, 'pressOut');
    expect(onPressOutMock).toHaveBeenCalled();
  });

  it('should apply custom icon color', () => {
    const { getByLabelText } = render(
      <ButtonIcon iconName={IconName.Add} iconColor="red" />,
    );
    const icon = getByLabelText(`icon-${IconName.Add}`);

    expect(icon.props.color).toBe('red');
  });

  it('should apply correct size', () => {
    const { getByRole } = render(
      <ButtonIcon iconName={IconName.Add} size={ButtonIconSizes.Lg} />,
    );
    const button = getByRole('button');

    expect(button.props.style.height.toString()).toBe(ButtonIconSizes.Lg);
  });

  it('should render different icons based on iconName', () => {
    const { getByLabelText, rerender } = render(
      <ButtonIcon iconName={IconName.Add} />,
    );
    let icon = getByLabelText(`icon-${IconName.Add}`);
    expect(icon).toBeTruthy();

    rerender(<ButtonIcon iconName={IconName.AddSquare} />);
    icon = getByLabelText(`icon-${IconName.AddSquare}`);
    expect(icon).toBeTruthy();
  });

  it('should change backgroundColor when pressed', () => {
    const { getByRole } = render(<ButtonIcon iconName={IconName.Add} />);
    const button = getByRole('button');

    // Check initial background color
    expect(button.props.style.backgroundColor).toBe(undefined);

    // Simulate pressIn
    fireEvent(button, 'pressIn');
    expect(button.props.style.backgroundColor).toBe(
      mockTheme.colors.background.pressed,
    );

    // Simulate pressOut
    fireEvent(button, 'pressOut');
    expect(button.props.style.backgroundColor).toBe(undefined);
  });
});
