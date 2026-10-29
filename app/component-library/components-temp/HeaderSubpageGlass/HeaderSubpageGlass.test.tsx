import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render, within } from '@testing-library/react-native';
import { IconName } from '@metamask/design-system-react-native';
import HeaderSubpageGlass from './HeaderSubpageGlass';
import { makeMutable } from 'react-native-reanimated';
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

describe('HeaderSubpageGlass', () => {
  it('renders the plain MMDS header when glass is off', () => {
    const { getByText, getByTestId, queryByTestId } = render(
      <HeaderSubpageGlass
        title="Ethereum"
        onBack={jest.fn()}
        backButtonProps={{ testID: 'back' }}
        isGlass={false}
      />,
    );

    expect(getByText('Ethereum')).toBeOnTheScreen();
    expect(getByTestId('back')).toBeOnTheScreen();
    expect(queryByTestId('capsule')).toBeNull();
    expect(queryByTestId(FLOATING_HEADER_FADE_TEST_ID)).toBeNull();
  });

  it('floats the header on its backdrop with its icons in capsules', () => {
    const onBack = jest.fn();
    const { getByText, getByTestId, getAllByTestId } = render(
      <HeaderSubpageGlass
        title="Ethereum"
        onBack={onBack}
        backButtonProps={{ testID: 'back' }}
        endButtonIconProps={[
          { iconName: IconName.Star, onPress: jest.fn(), testID: 'star' },
          {
            iconName: IconName.MoreVertical,
            onPress: jest.fn(),
            testID: 'more',
          },
        ]}
      />,
    );

    expect(getByText('Ethereum')).toBeOnTheScreen();
    expect(getByTestId(FLOATING_HEADER_FADE_TEST_ID)).toBeOnTheScreen();
    expect(getAllByTestId('capsule')).toHaveLength(3);
    expect(
      getAllByTestId(/^(star|more)$/).map((icon) => icon.props.testID),
    ).toEqual(['more', 'star']);

    fireEvent.press(getByTestId('back'));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it.each([
    [0, 0],
    [128, 1],
  ])('fades the backdrop with scrollY at %ipx', (offset, opacity) => {
    const { getByTestId } = render(
      <HeaderSubpageGlass title="Ethereum" scrollY={makeMutable(offset)} />,
    );

    expect(backdropFadeOpacity(getByTestId(FLOATING_HEADER_FADE_TEST_ID))).toBe(
      opacity,
    );
  });

  it('passes custom accessories through', () => {
    const { getByText, queryByTestId } = render(
      <HeaderSubpageGlass
        title="Ethereum"
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
      <HeaderSubpageGlass
        title="Ethereum"
        onClose={jest.fn()}
        closeButtonProps={{ testID: 'close' }}
      />,
    );

    expect(within(getByTestId('capsule')).getByTestId('close')).toBeTruthy();
  });
});
