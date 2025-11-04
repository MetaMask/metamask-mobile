import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import ButtonFilter from './ButtonFilter';

describe('ButtonFilter', () => {
  it('renders correctly ', () => {
    const { toJSON, getByText } = render(
      <ButtonFilter label="All" isActive onPress={jest.fn()} />,
    );

    expect(getByText('All')).toBeTruthy();
    expect(toJSON()).toMatchSnapshot();
  });

  it('calls onPress handler when pressed', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <ButtonFilter label="All" isActive={false} onPress={mockOnPress} />,
    );

    const button = getByText('All');
    fireEvent.press(button);

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('applies custom label props when provided', () => {
    const { getByText } = render(
      <ButtonFilter
        label="All"
        isActive={false}
        onPress={jest.fn()}
        labelProps={{ testID: 'custom-label' }}
      />,
    );

    const label = getByText('All');

    expect(label.props.testID).toBe('custom-label');
  });

  it('uses label as accessibility label when no custom accessibility label is provided', () => {
    const { getByLabelText } = render(
      <ButtonFilter label="All" isActive={false} onPress={jest.fn()} />,
    );

    expect(getByLabelText('All')).toBeTruthy();
  });

  it('uses custom accessibility label when provided', () => {
    const { getByLabelText } = render(
      <ButtonFilter
        label="All"
        isActive={false}
        onPress={jest.fn()}
        accessibilityLabel="Filter by all"
      />,
    );

    expect(getByLabelText('Filter by all')).toBeTruthy();
  });
});
