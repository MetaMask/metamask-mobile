import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';

// Render helper to provide theme context
import renderWithProvider from '../../../../../../util/test/renderWithProvider';

// Internal dependencies.
import ButtonBase from './ButtonBase';
import { ButtonSize } from '../../Button.types';

// For comparison
import StyledButton from '../../../../../../components/UI/StyledButton';
import Text from '../../../../Texts/Text';

describe('ButtonBase', () => {
  // This fails
  it('should render with role button by default', () => {
    const mockOnPress = jest.fn();
    const label = 'Click me!';
    renderWithProvider(
      <ButtonBase size={ButtonSize.Md} label={label} onPress={mockOnPress} />,
    );
    expect(screen.toJSON()).toMatchSnapshot();
    const button = screen.getByRole('button', { name: label });
    expect(button).toBeTruthy();
    fireEvent.press(button);
    expect(mockOnPress).toHaveBeenCalled();
  });

  // This passes, the only difference is the role button and accessible prop
  it('should render with role button if passed', () => {
    const mockOnPress = jest.fn();
    const label = 'Click me!';
    renderWithProvider(
      <ButtonBase
        size={ButtonSize.Md}
        label={label}
        onPress={mockOnPress}
        accessibilityRole="button"
        accessible
      />,
    );
    expect(screen.toJSON()).toMatchSnapshot();
    const button = screen.getByRole('button', { name: label });
    expect(button).toBeTruthy();
    fireEvent.press(button);
    expect(mockOnPress).toHaveBeenCalled();
  });
});

// For comparison, the button default behavior
describe('StyledButton', () => {
  it('should render with role button by default', () => {
    const mockOnPress = jest.fn();
    const label = 'Compare with this button';
    renderWithProvider(
      <StyledButton type={'blue'} onPress={mockOnPress}>
        <Text>{label}</Text>
      </StyledButton>,
    );
    expect(screen.toJSON()).toMatchSnapshot();
    const button = screen.getByRole('button', { name: label });
    expect(button).toBeTruthy();
    fireEvent.press(button);
    expect(mockOnPress).toHaveBeenCalled();
  });
});
