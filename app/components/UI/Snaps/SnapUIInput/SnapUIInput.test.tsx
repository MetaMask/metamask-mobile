import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SnapUIInput } from './SnapUIInput';
import { useSnapInterfaceContext } from '../../../Snaps/SnapInterfaceContext';

// Mock the entire module
jest.mock('../../../Snaps/SnapInterfaceContext');

describe('SnapUIInput', () => {
  const mockHandleInputChange = jest.fn();
  const mockSetCurrentFocusedInput = jest.fn();
  const mockGetValue = jest.fn();

  beforeEach(() => {
    // Set up the mock implementation before each test
    (useSnapInterfaceContext as jest.Mock).mockReturnValue({
      handleInputChange: mockHandleInputChange,
      getValue: mockGetValue,
      setCurrentFocusedInput: mockSetCurrentFocusedInput,
      focusedInput: null,
    });

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('renders with initial value', () => {
    mockGetValue.mockReturnValue('initial value');

    const { getByDisplayValue } = render(<SnapUIInput name="testInput" />);

    expect(getByDisplayValue('initial value')).toBeTruthy();
  });

  it('handles input changes', () => {
    const { getByTestId } = render(<SnapUIInput name="testInput" />);

    const input = getByTestId('textfield');
    fireEvent.changeText(input, 'new value');

    expect(mockHandleInputChange).toHaveBeenCalledWith(
      'testInput',
      'new value',
      undefined,
    );
  });

  it('handles form input changes', () => {
    const { getByTestId } = render(
      <SnapUIInput name="testInput" form="testForm" />,
    );

    const input = getByTestId('textfield');
    fireEvent.changeText(input, 'new value');

    expect(mockHandleInputChange).toHaveBeenCalledWith(
      'testInput',
      'new value',
      'testForm',
    );
  });

  it('handles focus events', () => {
    const { getByTestId } = render(<SnapUIInput name="testInput" />);

    const input = getByTestId('textfield');
    fireEvent(input, 'focus');

    expect(mockSetCurrentFocusedInput).toHaveBeenCalledWith('testInput');
  });

  it('handles blur events', () => {
    const { getByTestId } = render(<SnapUIInput name="testInput" />);

    const input = getByTestId('textfield');
    fireEvent(input, 'blur');

    expect(mockSetCurrentFocusedInput).toHaveBeenCalledWith(null);
  });

  it('updates value when initialValue changes', () => {
    mockGetValue.mockReturnValue('initial value');

    const { getByDisplayValue, rerender } = render(
      <SnapUIInput name="testInput" />,
    );

    expect(getByDisplayValue('initial value')).toBeTruthy();

    mockGetValue.mockReturnValue('updated value');
    rerender(<SnapUIInput name="testInput" />);

    expect(getByDisplayValue('updated value')).toBeTruthy();
  });

  it('maintains focus state when re-rendered', () => {
    (useSnapInterfaceContext as jest.Mock).mockReturnValue({
      handleInputChange: mockHandleInputChange,
      getValue: mockGetValue,
      setCurrentFocusedInput: mockSetCurrentFocusedInput,
      focusedInput: 'testInput',
    });

    const { getByTestId } = render(<SnapUIInput name="testInput" />);
    const input = getByTestId('textfield');

    expect(input).toBeTruthy();
    expect(useSnapInterfaceContext().focusedInput).toBe('testInput');
  });
});
