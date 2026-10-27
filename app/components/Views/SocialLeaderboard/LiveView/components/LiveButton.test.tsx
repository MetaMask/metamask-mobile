import {
  Button,
  ButtonSize,
  ButtonVariant,
  Icon,
  IconName,
  IconSize,
  TextColor,
} from '@metamask/design-system-react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { LiveViewSelectorsIDs } from '../LiveView.testIds';
import LiveButton from './LiveButton';

const getButton = () => screen.UNSAFE_getByType(Button);
const getIcon = () => screen.UNSAFE_getByType(Icon);

describe('LiveButton', () => {
  it('renders a medium secondary button with the play icon while live', () => {
    renderWithProvider(<LiveButton isLive onPress={jest.fn()} />);

    expect(screen.getByLabelText('Live')).toBeOnTheScreen();

    const button = getButton();
    expect(button.props.variant).toBe(ButtonVariant.Secondary);
    expect(button.props.size).toBe(ButtonSize.Md);
    expect(button.props.startIconName).toBe(IconName.Play);
    expect(button.props.textProps).toBeUndefined();
    expect(button.props.startIconProps).toBeUndefined();

    const icon = getIcon();
    expect(icon.props.name).toBe(IconName.Play);
    expect(icon.props.size).toBe(IconSize.Sm);
  });

  it('renders the pause icon in muted colors while paused', () => {
    renderWithProvider(<LiveButton isLive={false} onPress={jest.fn()} />);

    expect(screen.getByLabelText('Paused')).toBeOnTheScreen();

    const button = getButton();
    expect(button.props.startIconName).toBe(IconName.Pause);
    expect(button.props.textProps).toEqual({
      twClassName: TextColor.TextMuted,
    });
    expect(button.props.startIconProps).toEqual({
      twClassName: TextColor.TextMuted,
    });

    const icon = getIcon();
    expect(icon.props.name).toBe(IconName.Pause);
    expect(icon.props.size).toBe(IconSize.Sm);
    expect(icon.props.twClassName).toContain(TextColor.TextMuted);
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    renderWithProvider(<LiveButton isLive onPress={onPress} />);

    fireEvent.press(screen.getByTestId(LiveViewSelectorsIDs.STREAM_BUTTON));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
