import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import LiveStreamStatusDot from './LiveStreamStatusDot';
import { LiveViewSelectorsIDs } from '../LiveView.testIds';

describe('LiveStreamStatusDot', () => {
  it('renders the status dot', () => {
    renderWithProvider(<LiveStreamStatusDot isLive />);

    expect(
      screen.getByTestId(LiveViewSelectorsIDs.STREAM_STATUS_DOT),
    ).toBeOnTheScreen();
  });
});
