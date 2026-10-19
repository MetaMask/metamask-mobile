import React from 'react';
import { Text, processColor } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import HeaderGlass, { FLOATING_HEADER_FADE_TEST_ID } from './HeaderGlass';
import { mockTheme } from '../../../util/theme';
import { colorWithOpacity } from '../../../util/colors/colorWithOpacity';

describe('HeaderGlass', () => {
  it('renders the header over a fade from the screen colour', () => {
    const { getByTestId, getByText } = render(
      <HeaderGlass onLayout={jest.fn()} testID="header">
        <Text>Header</Text>
      </HeaderGlass>,
    );

    expect(getByText('Header')).toBeOnTheScreen();
    expect(getByTestId(FLOATING_HEADER_FADE_TEST_ID).props.colors).toEqual(
      [1, 0.7, 0.35, 0].map((opacity) =>
        processColor(
          colorWithOpacity(mockTheme.colors.background.default, opacity),
        ),
      ),
    );
  });

  it('floats at the top and pads for the status bar', () => {
    const { getByTestId } = render(
      <HeaderGlass onLayout={jest.fn()} topInset={47} testID="header">
        <Text>Header</Text>
      </HeaderGlass>,
    );

    expect(getByTestId('header')).toHaveStyle({
      position: 'absolute',
      top: 0,
      paddingTop: 47,
    });
  });

  it('reports its layout so the screen can inset its content', () => {
    const onLayout = jest.fn();
    const { getByTestId } = render(
      <HeaderGlass onLayout={onLayout} testID="header">
        <Text>Header</Text>
      </HeaderGlass>,
    );
    const event = { nativeEvent: { layout: { height: 103 } } };

    fireEvent(getByTestId('header'), 'layout', event);

    expect(onLayout).toHaveBeenCalledWith(event);
  });
});
