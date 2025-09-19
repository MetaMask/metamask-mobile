// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// External dependencies.
import {
  Icon,
  IconName,
  IconSize,
  Text,
} from '@metamask/design-system-react-native';

// Internal dependencies.
import { TabEmptyState } from './TabEmptyState';

describe('TabEmptyState', () => {
  const mockOnAction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders correctly with basic props', () => {
      const { getByTestId, getByText } = render(
        <TabEmptyState
          description="No items found"
          actionButtonText="Add Item"
          onAction={mockOnAction}
          testID="tab-empty-state"
        />,
      );

      expect(getByTestId('tab-empty-state')).toBeTruthy();
      expect(getByText('No items found')).toBeTruthy();
      expect(getByText('Add Item')).toBeTruthy();
    });

    it('renders description when provided', () => {
      const description = 'No items found';
      const { getByText } = render(
        <TabEmptyState description={description} testID="tab-empty-state" />,
      );

      expect(getByText(description)).toBeTruthy();
    });

    it('renders icon when provided', () => {
      const { getByTestId } = render(
        <TabEmptyState
          icon={
            <Icon name={IconName.Add} size={IconSize.Xl} testID="test-icon" />
          }
          testID="tab-empty-state"
        />,
      );

      expect(getByTestId('test-icon')).toBeTruthy();
    });

    it('renders action button when actionButtonText and onAction are provided', () => {
      const { getByText } = render(
        <TabEmptyState
          actionButtonText="Add Item"
          onAction={mockOnAction}
          testID="tab-empty-state"
        />,
      );

      expect(getByText('Add Item')).toBeTruthy();
    });

    it('does not render action button when only actionButtonText is provide', () => {
      const { queryByText } = render(
        <TabEmptyState actionButtonText="Add Item" testID="tab-empty-state" />,
      );

      expect(queryByText('Add Item')).toBeNull();
    });

    it('does not render action button when only onAction is provided', () => {
      const { queryByText } = render(
        <TabEmptyState onAction={mockOnAction} testID="tab-empty-state" />,
      );

      // Should not find any button since no actionButtonText is provided
      expect(queryByText('Add Item')).toBeNull();
    });

    it('renders custom children when provided', () => {
      const { getByTestId } = render(
        <TabEmptyState testID="tab-empty-state">
          <Text testID="custom-child">Custom child content</Text>
        </TabEmptyState>,
      );

      expect(getByTestId('custom-child')).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('calls onAction when action button is pressed', () => {
      const { getByText } = render(
        <TabEmptyState
          actionButtonText="Add Item"
          onAction={mockOnAction}
          testID="tab-empty-state"
        />,
      );

      fireEvent.press(getByText('Add Item'));
      expect(mockOnAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('Props', () => {
    it('passes descriptionProps to description Text component', () => {
      const customTestId = 'custom-description';
      const { getByTestId } = render(
        <TabEmptyState
          description="Test description"
          descriptionProps={{ testID: customTestId }}
          testID="tab-empty-state"
        />,
      );

      expect(getByTestId(customTestId)).toBeTruthy();
    });

    it('passes actionButtonProps to action Button component', () => {
      const customTestId = 'custom-button';
      const { getByTestId } = render(
        <TabEmptyState
          actionButtonText="Add Item"
          onAction={mockOnAction}
          actionButtonProps={{ testID: customTestId }}
          testID="tab-empty-state"
        />,
      );

      expect(getByTestId(customTestId)).toBeTruthy();
    });

    it('passes additional props to root Box component', () => {
      const customTestId = 'custom-root';
      const { getByTestId } = render(<TabEmptyState testID={customTestId} />);

      expect(getByTestId(customTestId)).toBeTruthy();
    });
  });
});
