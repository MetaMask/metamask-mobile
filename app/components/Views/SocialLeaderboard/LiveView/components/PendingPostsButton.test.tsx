import React from 'react';
import { screen } from '@testing-library/react-native';

import renderWithProvider from '../../../../../util/test/renderWithProvider';
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

  it('caps the pending post label at 60', () => {
    renderWithProvider(
      <PendingPostsButton pendingNewCount={61} onPress={jest.fn()} />,
    );

    expect(screen.getByLabelText('60+ new posts')).toBeOnTheScreen();
  });
});
