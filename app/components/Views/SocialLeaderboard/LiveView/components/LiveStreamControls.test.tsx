import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import LiveStreamControls from './LiveStreamControls';
import { LiveViewSelectorsIDs } from '../LiveView.testIds';

describe('LiveStreamControls', () => {
  it('renders the live action icon', () => {
    renderWithProvider(<LiveStreamControls isLive />);

    expect(
      screen.getByTestId(LiveViewSelectorsIDs.STREAM_ACTION_ICON),
    ).toBeOnTheScreen();
  });

  it('renders pause bars for a paused stream', () => {
    renderWithProvider(<LiveStreamControls isLive={false} />);

    expect(
      screen.getByTestId(LiveViewSelectorsIDs.STREAM_ACTION_ICON),
    ).toBeOnTheScreen();
  });
});
