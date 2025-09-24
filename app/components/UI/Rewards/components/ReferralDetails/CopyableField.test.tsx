import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CopyableField from './CopyableField';

describe('CopyableField', () => {
  const defaultProps = {
    label: 'Test Label',
    value: 'test-value-123',
    onCopy: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render correctly with all props', () => {
      const { getByText } = render(<CopyableField {...defaultProps} />);

      expect(getByText('Test Label')).toBeTruthy();
      expect(getByText('test-value-123')).toBeTruthy();
    });

    it('should render with null value', () => {
      const { getByText, queryByText } = render(
        <CopyableField {...defaultProps} value={null} />,
      );

      expect(getByText('Test Label')).toBeTruthy();
      expect(queryByText('test-value-123')).toBeNull();
    });

    it('should render without onCopy callback', () => {
      const { getByText } = render(
        <CopyableField label="Test Label" value="test-value" />,
      );

      expect(getByText('Test Label')).toBeTruthy();
      expect(getByText('test-value')).toBeTruthy();
    });
  });

  describe('copy functionality', () => {
    it('should call onCopy when copy button is pressed with valid value', () => {
      const mockOnCopy = jest.fn();
      const { getByLabelText } = render(
        <CopyableField {...defaultProps} onCopy={mockOnCopy} />,
      );

      const copyButton = getByLabelText('Copy');
      fireEvent.press(copyButton);

      expect(mockOnCopy).toHaveBeenCalledTimes(1);
    });

    it('should not call onCopy when copy button is pressed with null value', () => {
      const mockOnCopy = jest.fn();
      const { getByLabelText } = render(
        <CopyableField {...defaultProps} value={null} onCopy={mockOnCopy} />,
      );

      const copyButton = getByLabelText('Copy');
      fireEvent.press(copyButton);

      expect(mockOnCopy).not.toHaveBeenCalled();
    });

    it('should disable copy button when value is null', () => {
      const { getByLabelText } = render(
        <CopyableField {...defaultProps} value={null} />,
      );

      const copyButton = getByLabelText('Copy');
      expect(copyButton.props.accessibilityState?.disabled).toBe(true);
    });

    it('should enable copy button when value is provided', () => {
      const { getByLabelText } = render(<CopyableField {...defaultProps} />);

      const copyButton = getByLabelText('Copy');
      expect(copyButton.props.accessibilityState?.disabled).toBe(false);
    });
  });

  describe('accessibility', () => {
    it('should have proper accessibility properties', () => {
      const { getByLabelText } = render(<CopyableField {...defaultProps} />);

      const copyButton = getByLabelText('Copy');
      expect(copyButton).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('should handle empty string value', () => {
      const { getByText, getByLabelText } = render(
        <CopyableField {...defaultProps} value="" />,
      );

      expect(getByText('Test Label')).toBeTruthy();
      expect(getByText('-')).toBeTruthy();

      const copyButton = getByLabelText('Copy');
      expect(copyButton.props.accessibilityState?.disabled).toBe(true);
    });

    it('should handle long values', () => {
      const longValue = 'a'.repeat(100);
      const { getByText } = render(
        <CopyableField {...defaultProps} value={longValue} />,
      );

      expect(getByText(longValue)).toBeTruthy();
    });

    it('should handle special characters in value', () => {
      const specialValue = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const { getByText } = render(
        <CopyableField {...defaultProps} value={specialValue} />,
      );

      expect(getByText(specialValue)).toBeTruthy();
    });
  });
});
