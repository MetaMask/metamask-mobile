/* eslint-disable @typescript-eslint/no-require-imports */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ResourceToggle from './ResourceToggle';
import type { ButtonBaseProps } from '../../../../../../component-library/components/Buttons/Button/foundation/ButtonBase';

jest.mock(
  '../../../../../../component-library/components/Buttons/Button/foundation/ButtonBase',
  () => {
    const React = jest.requireActual('react');
    const { Pressable, Text } = jest.requireActual('react-native');

    const MockButtonBase = ({
      onPress,
      label,
      testID,
      style,
    }: ButtonBaseProps) => (
      <Pressable onPress={onPress} testID={testID} style={style}>
        {typeof label === 'string' ? <Text>{label}</Text> : label}
      </Pressable>
    );

    return { __esModule: true, default: MockButtonBase };
  },
);

describe('ResourceToggle', () => {
  it('triggers the bandwidth toggle to change on bandwidth press', () => {
    const onChange = jest.fn();

    const { getByTestId } = render(
      <ResourceToggle value="energy" onChange={onChange} />,
    );

    const bandwidthBtn = getByTestId('resource-toggle-bandwidth');
    fireEvent.press(bandwidthBtn);

    expect(onChange).toHaveBeenCalledWith('bandwidth');
  });

  it('triggers the energy toggle to change on energy press', () => {
    const onChange = jest.fn();

    const { getByTestId } = render(
      <ResourceToggle value="bandwidth" onChange={onChange} />,
    );

    const energyBtn = getByTestId('resource-toggle-energy');
    fireEvent.press(energyBtn);

    expect(onChange).toHaveBeenCalledWith('energy');
  });

  it('renders the energy and bandwidth labels', () => {
    const onChange = jest.fn();

    const { getByText } = render(
      <ResourceToggle
        value="energy"
        onChange={onChange}
        energyLabel="energy"
        bandwidthLabel="bandwidth"
      />,
    );

    expect(getByText('energy')).toBeTruthy();
    expect(getByText('bandwidth')).toBeTruthy();
  });
});
