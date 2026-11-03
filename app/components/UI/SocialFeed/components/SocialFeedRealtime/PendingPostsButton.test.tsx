import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';

import { playImpact, playSelection } from '#app/util/haptics';
import renderWithProvider from '#app/util/test/renderWithProvider';
import { SOCIAL_FEED_REALTIME_BUFFER_SIZE } from '#app/components/UI/SocialFeed/data/socialFeedRealtime';
import PendingPostsButton, {
  getPendingPostsLabelParts,
  PENDING_POSTS_SLOTS_PROBE_TEST_ID,
} from './PendingPostsButton';

jest.mock('#app/util/haptics', () => ({
  playImpact: jest.fn(() => Promise.resolve()),
  playSelection: jest.fn(() => Promise.resolve()),
}));

const mockPlayImpact = jest.mocked(playImpact);
const mockPlaySelection = jest.mocked(playSelection);

describe('getPendingPostsLabelParts', () => {
  it('splits the localized label around the count', () => {
    const parts = getPendingPostsLabelParts(14);

    expect(parts).toEqual({
      label: '14 new posts',
      leading: '',
      count: '14',
      trailing: ' new posts',
    });
  });

  it('keeps the cap marker attached to the capped count', () => {
    const parts = getPendingPostsLabelParts(
      SOCIAL_FEED_REALTIME_BUFFER_SIZE + 5,
    );

    expect(parts).toEqual({
      label: `${SOCIAL_FEED_REALTIME_BUFFER_SIZE}+ new posts`,
      leading: '',
      count: String(SOCIAL_FEED_REALTIME_BUFFER_SIZE),
      trailing: '+ new posts',
    });
  });
});

describe('PendingPostsButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the singular pending post label', () => {
    renderWithProvider(
      <PendingPostsButton pendingNewCount={1} onPress={jest.fn()} />,
    );

    expect(screen.getByLabelText('1 new post')).toBeOnTheScreen();
    expect(screen.getByText('new post')).toBeOnTheScreen();
  });

  it('renders the plural pending post label', () => {
    renderWithProvider(
      <PendingPostsButton pendingNewCount={2} onPress={jest.fn()} />,
    );

    expect(screen.getByLabelText('2 new posts')).toBeOnTheScreen();
    expect(screen.getByText('new posts')).toBeOnTheScreen();
  });

  it('caps the label at the realtime buffer size', () => {
    renderWithProvider(
      <PendingPostsButton
        pendingNewCount={SOCIAL_FEED_REALTIME_BUFFER_SIZE}
        onPress={jest.fn()}
      />,
    );

    expect(
      screen.getByLabelText(`${SOCIAL_FEED_REALTIME_BUFFER_SIZE}+ new posts`),
    ).toBeOnTheScreen();
    expect(screen.getByText('+ new posts')).toBeOnTheScreen();
  });

  it('shows the exact count just under the cap', () => {
    const count = SOCIAL_FEED_REALTIME_BUFFER_SIZE - 1;
    renderWithProvider(
      <PendingPostsButton pendingNewCount={count} onPress={jest.fn()} />,
    );

    expect(screen.getByLabelText(`${count} new posts`)).toBeOnTheScreen();
  });

  it('reserves the full slot width for the rolling count', () => {
    renderWithProvider(
      <PendingPostsButton pendingNewCount={14} onPress={jest.fn()} />,
    );

    const probe = screen.getByTestId(PENDING_POSTS_SLOTS_PROBE_TEST_ID, {
      includeHiddenElements: true,
    });
    const probeStyle = StyleSheet.flatten(probe.props.style);

    expect(probe).toHaveTextContent('00');
    expect(probeStyle).toEqual(
      expect.objectContaining({ height: 0, opacity: 0 }),
    );
    expect(probeStyle.position).toBeUndefined();
  });

  it('renders nothing without pending posts', () => {
    renderWithProvider(
      <PendingPostsButton pendingNewCount={0} onPress={jest.fn()} />,
    );

    expect(screen.queryByLabelText(/new post/)).toBeNull();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    renderWithProvider(
      <PendingPostsButton pendingNewCount={3} onPress={onPress} />,
    );

    fireEvent.press(screen.getByLabelText('3 new posts'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('plays a selection haptic when pressed', () => {
    renderWithProvider(
      <PendingPostsButton pendingNewCount={3} onPress={jest.fn()} />,
    );

    fireEvent.press(screen.getByLabelText('3 new posts'));

    expect(mockPlaySelection).toHaveBeenCalledTimes(1);
    expect(mockPlayImpact).not.toHaveBeenCalled();
  });
});
