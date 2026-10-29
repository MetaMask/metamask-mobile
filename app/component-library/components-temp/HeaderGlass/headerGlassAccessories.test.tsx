import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render, within } from '@testing-library/react-native';
import { IconName } from '@metamask/design-system-react-native';
import {
  resolveEndAccessoryGlass,
  resolveStartAccessoryGlass,
} from './headerGlassAccessories';

jest.mock('../CapsuleGlass', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => (
      <View testID="capsule">{children}</View>
    ),
  };
});

const renderSlot = (slot: React.ReactNode) => render(<>{slot}</>);

describe('resolveStartAccessoryGlass', () => {
  it('seats the back button in a capsule and keeps it pressable', () => {
    const onBack = jest.fn();
    const { getByTestId } = renderSlot(
      resolveStartAccessoryGlass({
        onBack,
        backButtonProps: { testID: 'back' },
      }),
    );

    expect(within(getByTestId('capsule')).getByTestId('back')).toBeTruthy();

    fireEvent.press(getByTestId('back'));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('prefers the back button props press handler, as MMDS does', () => {
    const onBack = jest.fn();
    const onPress = jest.fn();
    const { getByTestId } = renderSlot(
      resolveStartAccessoryGlass({
        onBack,
        backButtonProps: { testID: 'back', onPress },
      }),
    );

    fireEvent.press(getByTestId('back'));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onBack).not.toHaveBeenCalled();
  });

  it('prefers start icon props over the back button', () => {
    const { getByTestId, queryByTestId } = renderSlot(
      resolveStartAccessoryGlass({
        onBack: jest.fn(),
        backButtonProps: { testID: 'back' },
        startButtonIconProps: { iconName: IconName.Menu, testID: 'menu' },
      }),
    );

    expect(getByTestId('menu')).toBeTruthy();
    expect(queryByTestId('back')).toBeNull();
  });

  it('passes a custom accessory through without a capsule', () => {
    const { getByText, queryByTestId } = renderSlot(
      resolveStartAccessoryGlass({
        startAccessory: <Text>Custom</Text>,
        onBack: jest.fn(),
      }),
    );

    expect(getByText('Custom')).toBeTruthy();
    expect(queryByTestId('capsule')).toBeNull();
  });

  it('is empty without a start slot', () => {
    expect(resolveStartAccessoryGlass({})).toBeUndefined();
  });
});

describe('resolveEndAccessoryGlass', () => {
  it('orders the icons as MMDS does, with close rightmost', () => {
    const { getAllByTestId } = renderSlot(
      resolveEndAccessoryGlass({
        onClose: jest.fn(),
        closeButtonProps: { testID: 'close' },
        endButtonIconProps: [
          { iconName: IconName.Search, testID: 'search' },
          { iconName: IconName.Info, testID: 'info' },
        ],
      }),
    );

    expect(
      getAllByTestId(/^(close|search|info)$/).map((icon) => icon.props.testID),
    ).toEqual(['info', 'search', 'close']);
    expect(getAllByTestId('capsule')).toHaveLength(3);
  });

  it('closes through the close button', () => {
    const onClose = jest.fn();
    const { getByTestId } = renderSlot(
      resolveEndAccessoryGlass({
        onClose,
        closeButtonProps: { testID: 'close' },
      }),
    );

    fireEvent.press(getByTestId('close'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('prefers the close button props press handler, as MMDS does', () => {
    const onClose = jest.fn();
    const onPress = jest.fn();
    const { getByTestId } = renderSlot(
      resolveEndAccessoryGlass({
        onClose,
        closeButtonProps: { testID: 'close', onPress },
      }),
    );

    fireEvent.press(getByTestId('close'));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('passes a custom accessory through without a capsule', () => {
    const { getByText, queryByTestId } = renderSlot(
      resolveEndAccessoryGlass({
        endAccessory: <Text>Custom</Text>,
        onClose: jest.fn(),
      }),
    );

    expect(getByText('Custom')).toBeTruthy();
    expect(queryByTestId('capsule')).toBeNull();
  });

  it('is empty without an end slot', () => {
    expect(
      resolveEndAccessoryGlass({ endButtonIconProps: [] }),
    ).toBeUndefined();
  });
});
