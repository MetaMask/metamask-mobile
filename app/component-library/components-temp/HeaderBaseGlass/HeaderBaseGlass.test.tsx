import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import {
  IconName,
  type ButtonIconProps,
} from '@metamask/design-system-react-native';

import HeaderBaseGlass from './HeaderBaseGlass';
import { FLOATING_HEADER_FADE_TEST_ID } from '../HeaderGlass';

jest.mock('../CapsuleGlass', () => {
  const { View } = jest.requireActual('react-native');

  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => (
      <View testID="capsule">{children}</View>
    ),
  };
});

const endButtonIconProps: ButtonIconProps[] = [
  { iconName: IconName.Search, onPress: jest.fn(), testID: 'search' },
  { iconName: IconName.MoreVertical, onPress: jest.fn(), testID: 'more' },
];

describe('HeaderBaseGlass', () => {
  it('renders the plain MMDS header when glass is off', () => {
    const { getByText, getByTestId, queryByTestId } = render(
      <HeaderBaseGlass
        isGlass={false}
        startButtonIconProps={{
          iconName: IconName.ArrowLeft,
          onPress: jest.fn(),
          testID: 'back',
        }}
      >
        Accounts
      </HeaderBaseGlass>,
    );

    expect(getByText('Accounts')).toBeOnTheScreen();
    expect(getByTestId('back')).toBeOnTheScreen();
    expect(queryByTestId('capsule')).not.toBeOnTheScreen();
    expect(queryByTestId(FLOATING_HEADER_FADE_TEST_ID)).not.toBeOnTheScreen();
  });

  it('renders built-in icon props in glass capsules', () => {
    const { getByTestId, getAllByTestId } = render(
      <HeaderBaseGlass
        startButtonIconProps={{
          iconName: IconName.ArrowLeft,
          onPress: jest.fn(),
          testID: 'back',
        }}
        endButtonIconProps={endButtonIconProps}
      >
        Accounts
      </HeaderBaseGlass>,
    );

    expect(getByTestId(FLOATING_HEADER_FADE_TEST_ID)).toBeOnTheScreen();
    expect(getAllByTestId('capsule')).toHaveLength(3);
    expect(
      getAllByTestId(/^(search|more)$/).map((icon) => icon.props.testID),
    ).toEqual(['more', 'search']);
    expect(getByTestId('back')).toBeOnTheScreen();
  });

  it('keeps custom accessories outside glass capsules', () => {
    const { getByText, queryByTestId } = render(
      <HeaderBaseGlass
        isFloating={false}
        startAccessory={<Text>Start</Text>}
        endAccessory={<Text>End</Text>}
      >
        Accounts
      </HeaderBaseGlass>,
    );

    expect(getByText('Start')).toBeOnTheScreen();
    expect(getByText('End')).toBeOnTheScreen();
    expect(queryByTestId('capsule')).not.toBeOnTheScreen();
    expect(queryByTestId(FLOATING_HEADER_FADE_TEST_ID)).not.toBeOnTheScreen();
  });

  it('forwards MMDS props and layout callbacks when glass is off', () => {
    const onLayout = jest.fn();
    const event = { nativeEvent: { layout: { height: 103 } } };
    const { getByTestId } = render(
      <HeaderBaseGlass
        isGlass={false}
        includesTopInset
        childrenWrapperProps={{ testID: 'title-wrapper' }}
        textProps={{ testID: 'title' }}
        testID="header"
        onLayout={onLayout}
      >
        Accounts
      </HeaderBaseGlass>,
    );

    expect(getByTestId('header')).toBeOnTheScreen();
    expect(getByTestId('title-wrapper')).toBeOnTheScreen();
    expect(getByTestId('title')).toBeOnTheScreen();

    fireEvent(getByTestId('header'), 'layout', event);

    expect(onLayout).toHaveBeenCalledWith(event);
  });

  it('keeps a glass header in flow without a floating backdrop', () => {
    const { getByText, queryByTestId } = render(
      <HeaderBaseGlass isFloating={false}>Accounts</HeaderBaseGlass>,
    );

    expect(getByText('Accounts')).toBeOnTheScreen();
    expect(queryByTestId(FLOATING_HEADER_FADE_TEST_ID)).not.toBeOnTheScreen();
  });
});
