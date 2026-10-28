import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';

import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { SOCIAL_FEED_REALTIME_BUFFER_SIZE } from '../../data/socialFeedRealtime';
import PendingPostsButton from './PendingPostsButton';

describe('PendingPostsButton', () => {
  it('renders the singular pending post label', () => {
    renderWithProvider(
      <PendingPostsButton pendingNewCount={1} onPress={jest.fn()} />,
    );

    expect(screen.getByLabelText('1 new post')).toBeOnTheScreen();
  });

  it('renders the plural pending post label', () => {
    renderWithProvider(
      <PendingPostsButton pendingNewCount={2} onPress={jest.fn()} />,
    );

    expect(screen.getByLabelText('2 new posts')).toBeOnTheScreen();
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
  });

  it('shows the exact count just under the cap', () => {
    const count = SOCIAL_FEED_REALTIME_BUFFER_SIZE - 1;
    renderWithProvider(
      <PendingPostsButton pendingNewCount={count} onPress={jest.fn()} />,
    );

    expect(screen.getByLabelText(`${count} new posts`)).toBeOnTheScreen();
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
});
