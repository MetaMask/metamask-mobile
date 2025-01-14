import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FormTextField } from './index';
import { FormTextFieldSize } from './form-text-field.types';

describe('FormTextField', () => {
  it('renders correctly with basic props', () => {
    const { getByTestId } = render(
      <FormTextField
        id="test-field"
        label="Test Label"
        placeholder="Enter text"
      />,
    );

    const textField = getByTestId('form-text-field');
    expect(textField).toBeTruthy();
  });

  it('handles text input correctly', () => {
    const onChangeText = jest.fn();
    const { getByTestId } = render(
      <FormTextField id="test-field" onChangeText={onChangeText} />,
    );

    const textField = getByTestId('form-text-field');
    fireEvent.changeText(textField, 'test input');
    expect(onChangeText).toHaveBeenCalledWith('test input');
  });

  it('displays help text and error state correctly', () => {
    const { getByText } = render(
      <FormTextField helpText="Help message" error={true} />,
    );

    const helpText = getByText('Help message');
    expect(helpText).toBeTruthy();
  });

  it('renders in disabled state correctly', () => {
    const { getByTestId } = render(<FormTextField disabled={true} />);

    const textField = getByTestId('form-text-field');
    expect(textField.props.editable).toBe(false);
  });

  it('applies different sizes correctly', () => {
    const { getByTestId, rerender } = render(
      <FormTextField size={FormTextFieldSize.Sm} />,
    );

    let textField = getByTestId('form-text-field');
    expect(textField.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          height: 32,
          fontSize: 14,
        }),
      ]),
    );

    rerender(<FormTextField size={FormTextFieldSize.Lg} />);
    textField = getByTestId('form-text-field');
    expect(textField.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          height: 56,
          fontSize: 18,
        }),
      ]),
    );
  });

  it('handles focus and blur events', () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    const { getByTestId } = render(
      <FormTextField onFocus={onFocus} onBlur={onBlur} />,
    );

    const textField = getByTestId('form-text-field');
    fireEvent(textField, 'focus');
    expect(onFocus).toHaveBeenCalled();

    fireEvent(textField, 'blur');
    expect(onBlur).toHaveBeenCalled();
  });
});
