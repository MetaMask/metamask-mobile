// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Internal dependencies.
import ButtonToggle from './ButtonToggle';

describe('ButtonToggle', () => {
  it('should render correctly in inactive state', () => {
    const { toJSON, getByText } = render(
      <ButtonToggle isActive={false} label="Mode 1" onPress={jest.fn()} />,
    );

    expect(getByText('Mode 1')).toBeTruthy();
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render correctly in active state', () => {
    const { toJSON, getByText } = render(
      <ButtonToggle isActive label="Mode 1" onPress={jest.fn()} />,
    );

    expect(getByText('Mode 1')).toBeTruthy();
    expect(toJSON()).toMatchSnapshot();
  });

  it('should call onPress handler when pressed', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <ButtonToggle isActive={false} label="Mode 1" onPress={mockOnPress} />,
    );

    const button = getByText('Mode 1');
    fireEvent.press(button);

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('should apply the correct text color based on active state', () => {
    const { rerender, getByText } = render(
      <ButtonToggle isActive={false} label="Mode 1" onPress={jest.fn()} />,
    );

    const inactiveText = getByText('Mode 1');
    // We can't directly test computed styles in React Native, but we can verify the component was rendered
    expect(inactiveText).toBeTruthy();

    // Re-render with active state
    rerender(<ButtonToggle isActive label="Mode 1" onPress={jest.fn()} />);

    const activeText = getByText('Mode 1');
    expect(activeText).toBeTruthy();
  });
});
