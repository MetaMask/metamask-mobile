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
import {
  ImpactMoment,
  playImpact,
  playSelection,
} from '../../../../../util/haptics';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { SocialFeedRealtimeControlsSelectorsIDs } from './SocialFeedRealtimeControls.testIds';
import LiveButton from './LiveButton';

jest.mock('../../../../../util/haptics', () => ({
  ImpactMoment: { PullToRefresh: 'pullToRefresh' },
  playImpact: jest.fn(() => Promise.resolve()),
  playSelection: jest.fn(() => Promise.resolve()),
}));

const mockPlayImpact = jest.mocked(playImpact);
const mockPlaySelection = jest.mocked(playSelection);

const getButton = () => screen.UNSAFE_getByType(Button);
const getIcon = () => screen.UNSAFE_getByType(Icon);
const pressButton = () =>
  fireEvent.press(
    screen.getByTestId(SocialFeedRealtimeControlsSelectorsIDs.STREAM_BUTTON),
  );

describe('LiveButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a medium secondary button with the play icon while live', () => {
    renderWithProvider(
      <LiveButton isLive hasPendingPosts={false} onPress={jest.fn()} />,
    );

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
    renderWithProvider(
      <LiveButton isLive={false} hasPendingPosts={false} onPress={jest.fn()} />,
    );

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
    renderWithProvider(
      <LiveButton isLive hasPendingPosts={false} onPress={onPress} />,
    );

    pressButton();

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('plays a selection haptic when pausing', () => {
    renderWithProvider(
      <LiveButton isLive hasPendingPosts onPress={jest.fn()} />,
    );

    pressButton();

    expect(mockPlaySelection).toHaveBeenCalledTimes(1);
    expect(mockPlayImpact).not.toHaveBeenCalled();
  });

  it('plays a selection haptic when resuming without held posts', () => {
    renderWithProvider(
      <LiveButton isLive={false} hasPendingPosts={false} onPress={jest.fn()} />,
    );

    pressButton();

    expect(mockPlaySelection).toHaveBeenCalledTimes(1);
    expect(mockPlayImpact).not.toHaveBeenCalled();
  });

  it('plays a pull-to-refresh impact when resuming with held posts', () => {
    renderWithProvider(
      <LiveButton isLive={false} hasPendingPosts onPress={jest.fn()} />,
    );

    pressButton();

    expect(mockPlayImpact).toHaveBeenCalledTimes(1);
    expect(mockPlayImpact).toHaveBeenCalledWith(ImpactMoment.PullToRefresh);
    expect(mockPlaySelection).not.toHaveBeenCalled();
  });
});
