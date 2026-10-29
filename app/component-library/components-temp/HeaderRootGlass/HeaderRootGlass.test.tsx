import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render, within } from '@testing-library/react-native';
import { makeMutable } from 'react-native-reanimated';
import { IconName } from '@metamask/design-system-react-native';
import HeaderRootGlass from './HeaderRootGlass';
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

const endButtonIconProps = [
  { iconName: IconName.Search, onPress: jest.fn(), testID: 'search' },
];

describe('HeaderRootGlass', () => {
  it('renders the plain MMDS header when glass is off', () => {
    const { getByText, getByTestId, queryByTestId } = render(
      <HeaderRootGlass
        title="Money"
        endButtonIconProps={endButtonIconProps}
        isGlass={false}
      />,
    );

    expect(getByText('Money')).toBeOnTheScreen();
    expect(getByTestId('search')).toBeOnTheScreen();
    expect(queryByTestId('capsule')).toBeNull();
    expect(queryByTestId(FLOATING_HEADER_FADE_TEST_ID)).toBeNull();
  });

  it('floats the header on its backdrop with the end icons in capsules', () => {
    const { getByText, getByTestId } = render(
      <HeaderRootGlass title="Money" endButtonIconProps={endButtonIconProps} />,
    );

    expect(getByText('Money')).toBeOnTheScreen();
    expect(getByTestId(FLOATING_HEADER_FADE_TEST_ID)).toBeOnTheScreen();
    expect(within(getByTestId('capsule')).getByTestId('search')).toBeTruthy();
  });

  it('passes a custom end accessory through', () => {
    const { getByText, queryByTestId } = render(
      <HeaderRootGlass title="Money" endAccessory={<Text>Upgrade</Text>} />,
    );

    expect(getByText('Upgrade')).toBeOnTheScreen();
    expect(queryByTestId('capsule')).toBeNull();
  });

  it.each([
    [0, 0],
    [128, 1],
  ])('fades the backdrop with scrollY at %ipx', (offset, opacity) => {
    const { getByTestId } = render(
      <HeaderRootGlass title="Money" scrollY={makeMutable(offset)} />,
    );

    expect(backdropFadeOpacity(getByTestId(FLOATING_HEADER_FADE_TEST_ID))).toBe(
      opacity,
    );
  });

  it('keeps a static backdrop on at rest', () => {
    const { getByTestId } = render(
      <HeaderRootGlass
        title="Money"
        scrollY={makeMutable(0)}
        backdrop="static"
      />,
    );

    expect(backdropFadeOpacity(getByTestId(FLOATING_HEADER_FADE_TEST_ID))).toBe(
      1,
    );
  });

  it('reports the floating header layout', () => {
    const onLayout = jest.fn();
    const { getByTestId } = render(
      <HeaderRootGlass title="Money" onLayout={onLayout} testID="header" />,
    );
    const event = { nativeEvent: { layout: { height: 103 } } };

    fireEvent(getByTestId('header'), 'layout', event);

    expect(onLayout).toHaveBeenCalledWith(event);
  });
});
