import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { HeaderSearchVariant } from '@metamask/design-system-react-native';

import HeaderSearchGlass from './HeaderSearchGlass';
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

const textFieldSearchProps = {
  value: 'btc',
  onChangeText: jest.fn(),
  onPressClearButton: jest.fn(),
  placeholder: 'Search',
  inputAccessibilityLabel: 'Search',
  inputProps: { testID: 'search-input' },
};

describe('HeaderSearchGlass', () => {
  it('renders the plain MMDS header when glass is off', () => {
    const { getByTestId, getByText, queryByTestId } = render(
      <HeaderSearchGlass
        isGlass={false}
        variant={HeaderSearchVariant.Inline}
        onPressCancelButton={jest.fn()}
        textFieldSearchProps={textFieldSearchProps}
      />,
    );

    expect(getByTestId('search-input')).toBeOnTheScreen();
    expect(getByText('Cancel')).toBeOnTheScreen();
    expect(queryByTestId('capsule')).toBeNull();
  });

  it('puts the search field and cancel button in glass capsules on the inline variant', () => {
    const onPressCancelButton = jest.fn();
    const { getAllByTestId, getByTestId, getByText } = render(
      <HeaderSearchGlass
        variant={HeaderSearchVariant.Inline}
        onPressCancelButton={onPressCancelButton}
        cancelButtonProps={{ testID: 'cancel' }}
        textFieldSearchProps={textFieldSearchProps}
      />,
    );

    expect(getAllByTestId('capsule')).toHaveLength(2);
    expect(getByTestId('search-input')).toBeOnTheScreen();
    expect(getByText('Cancel')).toBeOnTheScreen();

    fireEvent.press(getByTestId('cancel'));

    expect(onPressCancelButton).toHaveBeenCalledTimes(1);
  });

  it('puts the back button and search field in glass capsules on the screen variant', () => {
    const onPressBackButton = jest.fn();
    const { getAllByTestId, getByTestId } = render(
      <HeaderSearchGlass
        variant={HeaderSearchVariant.Screen}
        onPressBackButton={onPressBackButton}
        backButtonProps={{ testID: 'back' }}
        textFieldSearchProps={textFieldSearchProps}
      />,
    );

    expect(getAllByTestId('capsule')).toHaveLength(2);

    fireEvent.press(getByTestId('back'));

    expect(onPressBackButton).toHaveBeenCalledTimes(1);
  });

  it('forwards typing and clearing to the search field props', () => {
    const onChangeText = jest.fn();
    const { getByTestId } = render(
      <HeaderSearchGlass
        variant={HeaderSearchVariant.Inline}
        onPressCancelButton={jest.fn()}
        textFieldSearchProps={{ ...textFieldSearchProps, onChangeText }}
      />,
    );

    fireEvent.changeText(getByTestId('search-input'), 'eth');

    expect(onChangeText).toHaveBeenCalledWith('eth');
  });

  it('draws no backdrop when kept in flow', () => {
    const { queryByTestId } = render(
      <HeaderSearchGlass
        isFloating={false}
        variant={HeaderSearchVariant.Inline}
        onPressCancelButton={jest.fn()}
        textFieldSearchProps={textFieldSearchProps}
      />,
    );

    expect(queryByTestId(FLOATING_HEADER_FADE_TEST_ID)).toBeNull();
  });
});
