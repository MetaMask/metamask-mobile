import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { IconName } from '@metamask/design-system-react-native';
import ButtonIconCapsule from './ButtonIconCapsule';

describe('ButtonIconCapsule', () => {
  it('renders the plain icon button by default', () => {
    const { getByTestId, queryByTestId } = render(
      <ButtonIconCapsule
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
      <ButtonIconCapsule
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
});
