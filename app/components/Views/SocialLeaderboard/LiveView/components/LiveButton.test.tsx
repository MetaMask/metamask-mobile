import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { LiveViewSelectorsIDs } from '../LiveView.testIds';
import LiveButton from './LiveButton';

describe('LiveButton', () => {
  it('labels the button Live with the play glyph while live', () => {
    renderWithProvider(<LiveButton isLive onPress={jest.fn()} />);

    expect(screen.getByLabelText('Live')).toBeOnTheScreen();
    expect(screen.getByText('▷')).toBeOnTheScreen();
  });

  it('labels the button Paused while paused', () => {
    renderWithProvider(<LiveButton isLive={false} onPress={jest.fn()} />);

    expect(screen.getByLabelText('Paused')).toBeOnTheScreen();
    expect(screen.queryByText('▷')).toBeNull();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    renderWithProvider(<LiveButton isLive onPress={onPress} />);

    fireEvent.press(screen.getByTestId(LiveViewSelectorsIDs.STREAM_BUTTON));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
