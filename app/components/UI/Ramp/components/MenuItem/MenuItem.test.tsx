import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import MenuItem from './MenuItem';
import { IconName } from '@metamask/design-system-react-native';

const createTestProps = (overrides = {}) => ({
  iconName: IconName.Add,
  title: 'Test Menu Item',
  description: 'Test description',
  onPress: jest.fn(),
  ...overrides,
});

describe('MenuItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with all props', () => {
    const props = createTestProps();
    render(<MenuItem {...props} />);

    expect(screen.getByText('Test Menu Item')).toBeOnTheScreen();
    expect(screen.getByText('Test description')).toBeOnTheScreen();
  });

  it('displays the correct title', () => {
    const customTitle = 'Custom Menu Title';
    const props = createTestProps({ title: customTitle });
    render(<MenuItem {...props} />);

    expect(screen.getByText(customTitle)).toBeOnTheScreen();
  });

  it('displays the correct description when provided', () => {
    const customDescription = 'Custom description text';
    const props = createTestProps({ description: customDescription });
    render(<MenuItem {...props} />);

    expect(screen.getByText(customDescription)).toBeOnTheScreen();
  });

  it('hides description when not provided', () => {
    const props = createTestProps({ description: undefined });
    render(<MenuItem {...props} />);

    expect(screen.queryByText('Test description')).not.toBeOnTheScreen();
  });

  it('calls onPress when pressed', () => {
    const mockOnPress = jest.fn();
    const props = createTestProps({ onPress: mockOnPress });
    render(<MenuItem {...props} />);

    fireEvent.press(screen.getByText('Test Menu Item'));

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('renders empty string title', () => {
    const props = createTestProps({ title: '' });
    render(<MenuItem {...props} />);

    expect(screen.getByText('')).toBeOnTheScreen();
  });
});
