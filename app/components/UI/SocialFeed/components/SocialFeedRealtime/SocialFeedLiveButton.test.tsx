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
import SocialFeedLiveButton from './SocialFeedLiveButton';
import { SocialFeedRealtimeSelectorsIDs } from './SocialFeedRealtime.testIds';
import {
  SocialFeedRealtimeContext,
  type SocialFeedRealtimeContextValue,
} from './SocialFeedRealtimeContext';

jest.mock('../../../../../util/haptics', () => ({
  ImpactMoment: { PullToRefresh: 'pullToRefresh' },
  playImpact: jest.fn(() => Promise.resolve()),
  playSelection: jest.fn(() => Promise.resolve()),
}));

const mockPlayImpact = jest.mocked(playImpact);
const mockPlaySelection = jest.mocked(playSelection);

const renderButton = (
  realtime: Partial<SocialFeedRealtimeContextValue> = {},
  onPausedChange = jest.fn(),
) => {
  renderWithProvider(
    <SocialFeedRealtimeContext.Provider
      value={{ paused: false, pendingNewCount: 0, ...realtime }}
    >
      <SocialFeedLiveButton onPausedChange={onPausedChange} />
    </SocialFeedRealtimeContext.Provider>,
  );
  return onPausedChange;
};

const getButton = () => screen.UNSAFE_getByType(Button);
const getIcon = () => screen.UNSAFE_getByType(Icon);
const pressButton = () =>
  fireEvent.press(
    screen.getByTestId(SocialFeedRealtimeSelectorsIDs.LIVE_BUTTON),
  );

describe('SocialFeedLiveButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing outside a virtualized feed', () => {
    renderWithProvider(<SocialFeedLiveButton onPausedChange={jest.fn()} />);

    expect(
      screen.queryByTestId(SocialFeedRealtimeSelectorsIDs.LIVE_BUTTON),
    ).toBeNull();
  });

  it('renders a small secondary button with the play icon while live', () => {
    renderButton();

    expect(screen.getByLabelText('Live')).toBeOnTheScreen();
    const button = getButton();
    expect(button.props.variant).toBe(ButtonVariant.Secondary);
    expect(button.props.size).toBe(ButtonSize.Sm);
    expect(button.props.startIconName).toBe(IconName.Play);
    expect(button.props.textProps).toBeUndefined();
    expect(button.props.startIconProps).toBeUndefined();
    const icon = getIcon();
    expect(icon.props.name).toBe(IconName.Play);
    expect(icon.props.size).toBe(IconSize.Sm);
  });

  it('renders the pause icon in muted colors while paused', () => {
    renderButton({ paused: true });

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
    expect(icon.props.twClassName).toContain(TextColor.TextMuted);
  });

  it('pauses with a selection haptic', () => {
    const onPausedChange = renderButton({ pendingNewCount: 3 });

    pressButton();

    expect(onPausedChange).toHaveBeenCalledWith(true);
    expect(mockPlaySelection).toHaveBeenCalledTimes(1);
    expect(mockPlayImpact).not.toHaveBeenCalled();
  });

  it('resumes without held posts with a selection haptic', () => {
    const onPausedChange = renderButton({ paused: true });

    pressButton();

    expect(onPausedChange).toHaveBeenCalledWith(false);
    expect(mockPlaySelection).toHaveBeenCalledTimes(1);
    expect(mockPlayImpact).not.toHaveBeenCalled();
  });

  it('resumes with held posts with a pull-to-refresh impact', () => {
    const onPausedChange = renderButton({ paused: true, pendingNewCount: 3 });

    pressButton();

    expect(onPausedChange).toHaveBeenCalledWith(false);
    expect(mockPlayImpact).toHaveBeenCalledTimes(1);
    expect(mockPlayImpact).toHaveBeenCalledWith(ImpactMoment.PullToRefresh);
    expect(mockPlaySelection).not.toHaveBeenCalled();
  });
});
