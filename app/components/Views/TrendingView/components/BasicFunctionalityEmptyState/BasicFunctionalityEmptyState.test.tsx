import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import BasicFunctionalityEmptyState from './BasicFunctionalityEmptyState';

describe('BasicFunctionalityEmptyState', () => {
  it('renders title text', () => {
    const mockOnEnablePress = jest.fn();

    const { getByText } = render(
      <BasicFunctionalityEmptyState onEnablePress={mockOnEnablePress} />,
    );

    expect(getByText('Explore is not available')).toBeDefined();
  });

  it('renders description text', () => {
    const mockOnEnablePress = jest.fn();

    const { getByText } = render(
      <BasicFunctionalityEmptyState onEnablePress={mockOnEnablePress} />,
    );

    expect(
      getByText(
        "We can't fetch the required metadata when basic functionality is disabled.",
      ),
    ).toBeDefined();
  });

  it('renders enable button with correct text', () => {
    const mockOnEnablePress = jest.fn();

    const { getByText } = render(
      <BasicFunctionalityEmptyState onEnablePress={mockOnEnablePress} />,
    );

    expect(getByText('Enable basic functionality')).toBeDefined();
  });

  it('calls onEnablePress when button is pressed', () => {
    const mockOnEnablePress = jest.fn();

    const { getByText } = render(
      <BasicFunctionalityEmptyState onEnablePress={mockOnEnablePress} />,
    );

    const enableButton = getByText('Enable basic functionality');

    fireEvent.press(enableButton);

    expect(mockOnEnablePress).toHaveBeenCalledTimes(1);
  });
});
