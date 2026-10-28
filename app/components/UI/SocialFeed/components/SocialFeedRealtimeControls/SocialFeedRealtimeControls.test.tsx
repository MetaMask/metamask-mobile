import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import { ImpactMoment, playImpact } from '../../../../../util/haptics';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  SocialFeedRealtimeContext,
  type SocialFeedRealtimeContextValue,
} from './SocialFeedRealtimeContext';
import SocialFeedRealtimeControls, {
  type SocialFeedRealtimeControlsProps,
} from './SocialFeedRealtimeControls';
import { SocialFeedRealtimeControlsSelectorsIDs } from './SocialFeedRealtimeControls.testIds';

jest.mock('../../../../../util/haptics', () => ({
  ImpactMoment: { PullToRefresh: 'pullToRefresh' },
  playImpact: jest.fn(() => Promise.resolve()),
  playSelection: jest.fn(() => Promise.resolve()),
}));

const mockPlayImpact = jest.mocked(playImpact);

const renderControls = (
  realtime: Partial<SocialFeedRealtimeContextValue>,
  props: SocialFeedRealtimeControlsProps = {},
) => {
  const value: SocialFeedRealtimeContextValue = {
    paused: false,
    pendingNewCount: 0,
    revealPending: jest.fn(),
    ...realtime,
  };
  renderWithProvider(
    <SocialFeedRealtimeContext.Provider value={value}>
      <SocialFeedRealtimeControls {...props} />
    </SocialFeedRealtimeContext.Provider>,
  );
  return value;
};

const pressStreamButton = () =>
  fireEvent.press(
    screen.getByTestId(SocialFeedRealtimeControlsSelectorsIDs.STREAM_BUTTON),
  );

describe('SocialFeedRealtimeControls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing outside a virtualized feed', () => {
    renderWithProvider(
      <SocialFeedRealtimeControls onPausedChange={jest.fn()} />,
    );

    expect(
      screen.queryByTestId(
        SocialFeedRealtimeControlsSelectorsIDs.STREAM_BUTTON,
      ),
    ).toBeNull();
  });

  it('renders nothing without a toggle or a post waiting', () => {
    renderControls({});

    expect(screen.queryByLabelText(/new post/)).toBeNull();
  });

  it('shows only the pill without onPausedChange', () => {
    renderControls({ pendingNewCount: 2 });

    expect(screen.getByLabelText('2 new posts')).toBeOnTheScreen();
    expect(
      screen.queryByTestId(
        SocialFeedRealtimeControlsSelectorsIDs.STREAM_BUTTON,
      ),
    ).toBeNull();
  });

  it('shows the Live toggle and mirrors paused', () => {
    renderControls({ paused: true }, { onPausedChange: jest.fn() });

    expect(screen.getByLabelText('Paused')).toBeOnTheScreen();
  });

  it('pauses without revealing', () => {
    const onPausedChange = jest.fn();
    const { revealPending } = renderControls({}, { onPausedChange });

    pressStreamButton();

    expect(onPausedChange).toHaveBeenCalledWith(true);
    expect(revealPending).not.toHaveBeenCalled();
  });

  it('reveals held posts when resuming', () => {
    const onPausedChange = jest.fn();
    const { revealPending } = renderControls(
      { paused: true },
      { onPausedChange },
    );

    pressStreamButton();

    expect(onPausedChange).toHaveBeenCalledWith(false);
    expect(revealPending).toHaveBeenCalledTimes(1);
  });

  it('tells the toggle about held posts', () => {
    renderControls(
      { paused: true, pendingNewCount: 3 },
      { onPausedChange: jest.fn() },
    );

    pressStreamButton();

    expect(mockPlayImpact).toHaveBeenCalledWith(ImpactMoment.PullToRefresh);
  });

  it('reveals from the pill', () => {
    const { revealPending } = renderControls(
      { pendingNewCount: 3 },
      { onPausedChange: jest.fn() },
    );

    fireEvent.press(screen.getByLabelText('3 new posts'));

    expect(revealPending).toHaveBeenCalledTimes(1);
  });
});
