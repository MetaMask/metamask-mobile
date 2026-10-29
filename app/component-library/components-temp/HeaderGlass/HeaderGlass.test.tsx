import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { makeMutable } from 'react-native-reanimated';
import HeaderGlass, { FLOATING_HEADER_FADE_TEST_ID } from './HeaderGlass';
import HeaderGlassBackdrop from './HeaderGlassBackdrop';

jest.mock('./HeaderGlassBackdrop', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: jest.fn(({ testID }: { testID?: string }) => (
      <View testID={testID} />
    )),
  };
});

const backdropProps = () => jest.mocked(HeaderGlassBackdrop).mock.calls[0][0];

describe('HeaderGlass', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the header over its backdrop', () => {
    const { getByTestId, getByText } = render(
      <HeaderGlass onLayout={jest.fn()} testID="header">
        <Text>Header</Text>
      </HeaderGlass>,
    );

    expect(getByText('Header')).toBeOnTheScreen();
    expect(getByTestId(FLOATING_HEADER_FADE_TEST_ID)).toBeOnTheScreen();
  });

  it('fades the backdrop in with the scroll by default', () => {
    const scrollDistance = makeMutable(0);

    render(
      <HeaderGlass scrollDistance={scrollDistance} fadeInDistance={80}>
        <Text>Header</Text>
      </HeaderGlass>,
    );

    expect(backdropProps()).toEqual(
      expect.objectContaining({ scrollDistance, fadeInDistance: 80 }),
    );
  });

  it('keeps a static backdrop on regardless of the scroll', () => {
    render(
      <HeaderGlass backdrop="static" scrollDistance={makeMutable(0)}>
        <Text>Header</Text>
      </HeaderGlass>,
    );

    expect(backdropProps().scrollDistance).toBeUndefined();
  });

  it('drops the backdrop for none', () => {
    const { queryByTestId } = render(
      <HeaderGlass backdrop="none">
        <Text>Header</Text>
      </HeaderGlass>,
    );

    expect(queryByTestId(FLOATING_HEADER_FADE_TEST_ID)).toBeNull();
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

  it('stays in flow without a backdrop when it is not floating', () => {
    const { getByTestId, queryByTestId } = render(
      <HeaderGlass isFloating={false} backdrop="static" testID="header">
        <Text>Header</Text>
      </HeaderGlass>,
    );

    expect(getByTestId('header')).not.toHaveStyle({ position: 'absolute' });
    expect(queryByTestId(FLOATING_HEADER_FADE_TEST_ID)).toBeNull();
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
