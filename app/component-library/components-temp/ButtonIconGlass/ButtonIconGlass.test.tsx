import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ButtonIconSize, IconName } from '@metamask/design-system-react-native';
import ButtonIconGlass from './ButtonIconGlass';

describe('ButtonIconGlass', () => {
  it('renders the plain icon button by default', () => {
    const { getByTestId, queryByTestId } = render(
      <ButtonIconGlass
        iconName={IconName.Search}
        onPress={jest.fn()}
        testID="search"
        capsuleTestID="search-capsule"
      />,
    );

    expect(getByTestId('search')).toBeOnTheScreen();
    expect(queryByTestId('search-capsule')).not.toBeOnTheScreen();
  });

  it('seats the icon in a capsule and keeps it pressable', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <ButtonIconGlass
        isCapsule
        iconName={IconName.Search}
        onPress={onPress}
        testID="search"
        capsuleTestID="search-capsule"
      />,
    );

    expect(getByTestId('search-capsule')).toBeOnTheScreen();

    fireEvent.press(getByTestId('search'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('stretches the tap area over the capsule ring', () => {
    const { getByTestId } = render(
      <ButtonIconGlass
        isCapsule
        iconName={IconName.Search}
        onPress={jest.fn()}
        testID="search"
      />,
    );

    expect(getByTestId('search').props.hitSlop).toBe(4);
  });

  it('keeps a hit slop passed by the caller', () => {
    const { getByTestId } = render(
      <ButtonIconGlass
        isCapsule
        hitSlop={8}
        iconName={IconName.Search}
        onPress={jest.fn()}
        testID="search"
      />,
    );

    expect(getByTestId('search').props.hitSlop).toBe(8);
  });

  it('leaves the plain icon button tap area unchanged', () => {
    const { getByTestId } = render(
      <ButtonIconGlass
        iconName={IconName.Search}
        onPress={jest.fn()}
        testID="search"
      />,
    );

    expect(getByTestId('search').props.hitSlop).toBeUndefined();
  });

  it.each([
    [ButtonIconSize.Xs, 28],
    [ButtonIconSize.Sm, 32],
    [ButtonIconSize.Md, 40],
    [ButtonIconSize.Lg, 48],
  ])('sizes the capsule to a %s icon plus a ring', (size, capsuleSize) => {
    const { getByTestId } = render(
      <ButtonIconGlass
        isCapsule
        size={size}
        iconName={IconName.Search}
        onPress={jest.fn()}
        capsuleTestID="search-capsule"
      />,
    );

    expect(getByTestId('search-capsule')).toHaveStyle({
      width: capsuleSize,
      height: capsuleSize,
    });
  });
});
