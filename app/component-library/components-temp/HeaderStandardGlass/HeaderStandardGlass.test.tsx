import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render, within } from '@testing-library/react-native';
import { IconName } from '@metamask/design-system-react-native';
import { makeMutable } from 'react-native-reanimated';

import HeaderStandardGlass from './HeaderStandardGlass';
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

describe('HeaderStandardGlass', () => {
  it('renders the plain MMDS header when glass is off', () => {
    const { getByText, getByTestId, queryByTestId } = render(
      <HeaderStandardGlass
        title="Accounts"
        subtitle="3 accounts"
        onBack={jest.fn()}
        backButtonProps={{ testID: 'back' }}
        isGlass={false}
      />,
    );

    expect(getByText('Accounts')).toBeOnTheScreen();
    expect(getByText('3 accounts')).toBeOnTheScreen();
    expect(getByTestId('back')).toBeOnTheScreen();
    expect(queryByTestId('capsule')).toBeNull();
    expect(queryByTestId(FLOATING_HEADER_FADE_TEST_ID)).toBeNull();
  });

  it('renders children in place of the title', () => {
    const { getByText, queryByText } = render(
      <HeaderStandardGlass title="Accounts">
        <Text>Custom title</Text>
      </HeaderStandardGlass>,
    );

    expect(getByText('Custom title')).toBeOnTheScreen();
    expect(queryByText('Accounts')).not.toBeOnTheScreen();
  });

  it('floats the header on its backdrop with its icons in capsules', () => {
    const onBack = jest.fn();
    const { getByText, getByTestId, getAllByTestId } = render(
      <HeaderStandardGlass
        title="Accounts"
        onBack={onBack}
        backButtonProps={{ testID: 'back' }}
        endButtonIconProps={[
          { iconName: IconName.Search, onPress: jest.fn(), testID: 'search' },
          {
            iconName: IconName.MoreVertical,
            onPress: jest.fn(),
            testID: 'more',
          },
        ]}
      />,
    );

    expect(getByText('Accounts')).toBeOnTheScreen();
    expect(getByTestId(FLOATING_HEADER_FADE_TEST_ID)).toBeOnTheScreen();
    expect(getAllByTestId('capsule')).toHaveLength(3);
    expect(
      getAllByTestId(/^(search|more)$/).map((icon) => icon.props.testID),
    ).toEqual(['more', 'search']);

    fireEvent.press(getByTestId('back'));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it.each([
    [0, 0],
    [128, 1],
  ])('fades the backdrop with scrollY at %ipx', (offset, opacity) => {
    const { getByTestId } = render(
      <HeaderStandardGlass title="Accounts" scrollY={makeMutable(offset)} />,
    );

    expect(backdropFadeOpacity(getByTestId(FLOATING_HEADER_FADE_TEST_ID))).toBe(
      opacity,
    );
  });

  it('drops the backdrop for none', () => {
    const { queryByTestId } = render(
      <HeaderStandardGlass title="Accounts" backdrop="none" />,
    );

    expect(queryByTestId(FLOATING_HEADER_FADE_TEST_ID)).toBeNull();
  });

  it('passes custom accessories through', () => {
    const { getByText, queryByTestId } = render(
      <HeaderStandardGlass
        title="Accounts"
        startAccessory={<Text>Start</Text>}
        endAccessory={<Text>End</Text>}
      />,
    );

    expect(getByText('Start')).toBeOnTheScreen();
    expect(getByText('End')).toBeOnTheScreen();
    expect(queryByTestId('capsule')).toBeNull();
  });

  it('seats a lone close button in a capsule', () => {
    const { getByTestId } = render(
      <HeaderStandardGlass
        title="Accounts"
        onClose={jest.fn()}
        closeButtonProps={{ testID: 'close' }}
      />,
    );

    expect(within(getByTestId('capsule')).getByTestId('close')).toBeTruthy();
  });

  it('reports the floating header layout so the screen can inset its content', () => {
    const onLayout = jest.fn();
    const { getByTestId } = render(
      <HeaderStandardGlass
        title="Accounts"
        onLayout={onLayout}
        testID="header"
      />,
    );
    const event = { nativeEvent: { layout: { height: 103 } } };

    fireEvent(getByTestId('header'), 'layout', event);

    expect(onLayout).toHaveBeenCalledWith(event);
  });
});
