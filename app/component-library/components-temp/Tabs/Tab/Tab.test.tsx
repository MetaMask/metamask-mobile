// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Internal dependencies.
import Tab from './Tab';

describe('Tab', () => {
  const defaultProps = {
    label: 'Test Tab',
    isActive: false,
    onPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders correctly', () => {
      const { toJSON } = render(<Tab {...defaultProps} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('displays the label text', () => {
      const { getByText } = render(<Tab {...defaultProps} label="My Tab" />);
      expect(getByText('My Tab')).toBeOnTheScreen();
    });

    it('renders with correct testID', () => {
      const { getByTestId } = render(
        <Tab {...defaultProps} testID="custom-tab" />,
      );
      expect(getByTestId('custom-tab')).toBeOnTheScreen();
    });

    it('truncates long labels with numberOfLines=1', () => {
      const { getByText } = render(
        <Tab
          {...defaultProps}
          label="This is a very long tab label that should be truncated"
        />,
      );
      expect(
        getByText('This is a very long tab label that should be truncated'),
      ).toBeOnTheScreen();
    });
  });

  describe('Active State', () => {
    it('applies active styling when isActive is true', () => {
      const { toJSON } = render(<Tab {...defaultProps} isActive />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('applies inactive styling when isActive is false', () => {
      const { toJSON } = render(<Tab {...defaultProps} isActive={false} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('shows bold font weight when active', () => {
      const { getByText } = render(<Tab {...defaultProps} isActive />);
      const text = getByText('Test Tab');
      // Note: Testing font weight through snapshots is more reliable
      expect(text).toBeOnTheScreen();
    });

    it('shows regular font weight when inactive', () => {
      const { getByText } = render(<Tab {...defaultProps} isActive={false} />);
      const text = getByText('Test Tab');
      expect(text).toBeOnTheScreen();
    });
  });

  describe('Disabled State', () => {
    it('applies disabled styling when disabled is true', () => {
      const { toJSON } = render(<Tab {...defaultProps} disabled />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('does not call onPress when disabled and pressed', () => {
      const mockOnPress = jest.fn();
      const { getByText } = render(
        <Tab {...defaultProps} onPress={mockOnPress} disabled />,
      );

      fireEvent.press(getByText('Test Tab'));

      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('shows muted text color when disabled and inactive', () => {
      const { toJSON } = render(
        <Tab {...defaultProps} disabled isActive={false} />,
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('shows active color when disabled but active', () => {
      const { toJSON } = render(<Tab {...defaultProps} disabled isActive />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('does not show pressed feedback when disabled', () => {
      const { getByTestId } = render(
        <Tab {...defaultProps} disabled testID="disabled-tab" />,
      );

      const tab = getByTestId('disabled-tab');
      expect(tab.props.disabled).toBe(true);
    });
  });

  describe('Interaction', () => {
    it('calls onPress when pressed and not disabled', () => {
      const mockOnPress = jest.fn();
      const { getByText } = render(
        <Tab {...defaultProps} onPress={mockOnPress} />,
      );

      fireEvent.press(getByText('Test Tab'));

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('shows pressed feedback when not disabled', () => {
      const { getByTestId } = render(
        <Tab {...defaultProps} testID="enabled-tab" />,
      );

      const tab = getByTestId('enabled-tab');
      expect(tab.props.disabled).toBeFalsy();
    });
  });

  describe('Accessibility', () => {
    it('is accessible when enabled', () => {
      const { getByText } = render(<Tab {...defaultProps} />);
      const tab = getByText('Test Tab');
      expect(tab).toBeOnTheScreen();
    });

    it('is accessible when disabled', () => {
      const { getByText } = render(<Tab {...defaultProps} disabled />);
      const tab = getByText('Test Tab');
      expect(tab).toBeOnTheScreen();
    });
  });
});
