import React from 'react';
import { fireEvent, render, within } from '@testing-library/react-native';
import { makeMutable } from 'react-native-reanimated';
import HeaderStandardAnimatedGlass from './HeaderStandardAnimatedGlass';
import { FLOATING_HEADER_FADE_TEST_ID } from '../HeaderGlass';
import { backdropFadeOpacity } from '../HeaderGlass/test-utils';

jest.mock('../CapsuleGlass', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => (
      <View testID="capsule">{children}</View>
    ),
  };
});

const baseProps = () => ({
  title: 'Perps',
  scrollY: makeMutable(0),
  titleSectionHeight: makeMutable(0),
  onBack: jest.fn(),
  backButtonProps: { testID: 'back' },
  testID: 'header',
});

describe('HeaderStandardAnimatedGlass', () => {
  it('renders the plain MMDS header when glass is off', () => {
    const { getByTestId, queryByTestId } = render(
      <HeaderStandardAnimatedGlass {...baseProps()} isGlass={false} />,
    );

    expect(getByTestId('back')).toBeOnTheScreen();
    expect(queryByTestId('capsule')).toBeNull();
    expect(queryByTestId(FLOATING_HEADER_FADE_TEST_ID)).toBeNull();
  });

  it('floats the header on its backdrop with the back button in a capsule', () => {
    const props = baseProps();
    const { getByTestId } = render(<HeaderStandardAnimatedGlass {...props} />);

    expect(getByTestId('header')).toBeOnTheScreen();
    expect(getByTestId(FLOATING_HEADER_FADE_TEST_ID)).toBeOnTheScreen();
    expect(within(getByTestId('capsule')).getByTestId('back')).toBeTruthy();

    fireEvent.press(getByTestId('back'));

    expect(props.onBack).toHaveBeenCalledTimes(1);
  });

  it.each([
    [0, 0],
    [128, 1],
  ])('fades the backdrop with scrollY at %ipx', (offset, opacity) => {
    const { getByTestId } = render(
      <HeaderStandardAnimatedGlass
        {...baseProps()}
        scrollY={makeMutable(offset)}
      />,
    );

    expect(backdropFadeOpacity(getByTestId(FLOATING_HEADER_FADE_TEST_ID))).toBe(
      opacity,
    );
  });

  it('drops the backdrop for none', () => {
    const { queryByTestId } = render(
      <HeaderStandardAnimatedGlass {...baseProps()} backdrop="none" />,
    );

    expect(queryByTestId(FLOATING_HEADER_FADE_TEST_ID)).toBeNull();
  });

  it('reports the floating header layout so the screen can inset its content', () => {
    const onLayout = jest.fn();
    const { getByTestId } = render(
      <HeaderStandardAnimatedGlass {...baseProps()} onLayout={onLayout} />,
    );
    const event = { nativeEvent: { layout: { height: 103 } } };

    fireEvent(getByTestId('header'), 'layout', event);

    expect(onLayout).toHaveBeenCalledWith(event);
  });
});
