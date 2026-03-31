// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Internal dependencies.
import MenuItem from './MenuItem';
import { IconName } from '../../../../../component-library/components/Icons/Icon';

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

  it('renders snapshot correctly', () => {
    const props = createTestProps();
    const wrapper = render(<MenuItem {...props} />);
    expect(wrapper).toMatchSnapshot();
  });

  it('renders with title only', () => {
    const props = createTestProps({ description: undefined });
    const wrapper = render(<MenuItem {...props} />);
    expect(wrapper).toMatchSnapshot();
  });

  it('renders with different icon', () => {
    const props = createTestProps({ iconName: IconName.Bank });
    const wrapper = render(<MenuItem {...props} />);
    expect(wrapper).toMatchSnapshot();
  });

  it('renders with empty description', () => {
    const props = createTestProps({ description: '' });
    const wrapper = render(<MenuItem {...props} />);
    expect(wrapper).toMatchSnapshot();
  });

  it('displays the correct title', () => {
    const customTitle = 'Custom Menu Title';
    const props = createTestProps({ title: customTitle });
    const { getByText } = render(<MenuItem {...props} />);

    expect(getByText(customTitle)).toBeTruthy();
  });

  it('displays the correct description when provided', () => {
    const customDescription = 'Custom description text';
    const props = createTestProps({ description: customDescription });
    const { getByText } = render(<MenuItem {...props} />);

    expect(getByText(customDescription)).toBeTruthy();
  });

  it('hides description when not provided', () => {
    const props = createTestProps({ description: undefined });
    const { queryByText } = render(<MenuItem {...props} />);

    expect(queryByText('Test description')).toBeNull();
  });

  it('calls onPress when pressed', () => {
    const mockOnPress = jest.fn();
    const props = createTestProps({ onPress: mockOnPress });
    const { getByText } = render(<MenuItem {...props} />);

    fireEvent.press(getByText('Test Menu Item'));

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('renders empty string title', () => {
    const props = createTestProps({ title: '' });
    const { getByText } = render(<MenuItem {...props} />);

    expect(getByText('')).toBeTruthy();
  });
});
