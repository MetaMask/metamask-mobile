import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import LiveIcon from './LiveIcon';
import { LiveViewSelectorsIDs } from '../LiveView.testIds';

describe('LiveIcon', () => {
  it('renders the play glyph while live', () => {
    renderWithProvider(<LiveIcon isLive />);

    expect(screen.getByText('▷')).toBeOnTheScreen();
  });

  it('renders pause bars while paused', () => {
    renderWithProvider(<LiveIcon isLive={false} />);

    expect(
      screen.getByTestId(LiveViewSelectorsIDs.STREAM_ACTION_ICON),
    ).toBeOnTheScreen();
    expect(screen.queryByText('▷')).toBeNull();
  });
});
