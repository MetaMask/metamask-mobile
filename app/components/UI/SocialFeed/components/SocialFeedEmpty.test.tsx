import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import SocialFeedEmpty from './SocialFeedEmpty';

describe('SocialFeedEmpty', () => {
  it('tells the user there are no trades yet', () => {
    renderWithProvider(<SocialFeedEmpty />);

    expect(screen.getByText('No trades yet')).toBeOnTheScreen();
  });
});
