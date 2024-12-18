// Third party dependencies.
import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';

// Internal dependencies.
import PickerBase from './PickerBase';
import { IconName, IconSize } from '../../Icons/Icon';

describe('PickerBase', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <PickerBase onPress={jest.fn()}>
        <Text>Test Content</Text>
      </PickerBase>,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should call onPress when pressed', () => {
    const onPressMock = jest.fn();
    const { getByText } = render(
      <PickerBase onPress={onPressMock}>
        <Text>Test Content</Text>
      </PickerBase>,
    );

    fireEvent.press(getByText('Test Content'));
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('should render children correctly', () => {
    const { getByText } = render(
      <PickerBase onPress={jest.fn()}>
        <Text>Child Component</Text>
      </PickerBase>,
    );

    expect(getByText('Child Component')).toBeTruthy();
  });

  it('should render dropdown icon', () => {
    const { UNSAFE_getByProps } = render(
      <PickerBase onPress={jest.fn()}>
        <Text>Test Content</Text>
      </PickerBase>,
    );

    const icon = UNSAFE_getByProps({ name: IconName.ArrowDown });
    expect(icon).toBeTruthy();
  });

  it('should apply custom icon size', () => {
    const { UNSAFE_getByProps } = render(
      <PickerBase onPress={jest.fn()} iconSize={IconSize.Lg}>
        <Text>Test Content</Text>
      </PickerBase>,
    );

    const icon = UNSAFE_getByProps({
      name: IconName.ArrowDown,
      size: IconSize.Lg,
    });
    expect(icon).toBeTruthy();
  });

  it('should apply custom dropdown icon style', () => {
    const customStyle = { marginLeft: 20 };
    const { UNSAFE_getByProps } = render(
      <PickerBase onPress={jest.fn()} dropdownIconStyle={customStyle}>
        <Text>Test Content</Text>
      </PickerBase>,
    );

    const icon = UNSAFE_getByProps({ name: IconName.ArrowDown });
    expect(icon.props.style).toEqual(expect.objectContaining(customStyle));
  });
});
