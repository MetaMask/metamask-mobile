import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { View, Text } from 'react-native';
import PerpsHomeSection from './PerpsHomeSection';

describe('PerpsHomeSection', () => {
  const mockSkeleton = () => <View testID="skeleton-loader" />;
  const mockChildren = <Text testID="section-content">Content</Text>;

  describe('rendering', () => {
    it('renders section with title', () => {
      const { getByText } = render(
        <PerpsHomeSection
          title="Test Section"
          isLoading={false}
          isEmpty={false}
          renderSkeleton={mockSkeleton}
        >
          {mockChildren}
        </PerpsHomeSection>,
      );

      expect(getByText('Test Section')).toBeTruthy();
    });

    it('renders children when not loading', () => {
      const { getByTestId } = render(
        <PerpsHomeSection
          title="Test Section"
          isLoading={false}
          isEmpty={false}
          renderSkeleton={mockSkeleton}
        >
          {mockChildren}
        </PerpsHomeSection>,
      );

      expect(getByTestId('section-content')).toBeTruthy();
    });

    it('renders skeleton when loading', () => {
      const { getByTestId, queryByTestId } = render(
        <PerpsHomeSection
          title="Test Section"
          isLoading
          isEmpty={false}
          renderSkeleton={mockSkeleton}
        >
          {mockChildren}
        </PerpsHomeSection>,
      );

      expect(getByTestId('skeleton-loader')).toBeTruthy();
      expect(queryByTestId('section-content')).toBeNull();
    });

    it('applies custom testID', () => {
      const { getByTestId } = render(
        <PerpsHomeSection
          title="Test Section"
          isLoading={false}
          isEmpty={false}
          renderSkeleton={mockSkeleton}
          testID="custom-section"
        >
          {mockChildren}
        </PerpsHomeSection>,
      );

      expect(getByTestId('custom-section')).toBeTruthy();
    });
  });

  describe('empty state behavior', () => {
    it('hides section when empty and showWhenEmpty is false', () => {
      const { queryByText } = render(
        <PerpsHomeSection
          title="Test Section"
          isLoading={false}
          isEmpty
          showWhenEmpty={false}
          renderSkeleton={mockSkeleton}
        >
          {mockChildren}
        </PerpsHomeSection>,
      );

      expect(queryByText('Test Section')).toBeNull();
    });

    it('shows section when empty and showWhenEmpty is true', () => {
      const { getByText } = render(
        <PerpsHomeSection
          title="Test Section"
          isLoading={false}
          isEmpty
          showWhenEmpty
          renderSkeleton={mockSkeleton}
        >
          {mockChildren}
        </PerpsHomeSection>,
      );

      expect(getByText('Test Section')).toBeTruthy();
    });

    it('hides section when empty by default with showWhenEmpty undefined', () => {
      const { queryByText } = render(
        <PerpsHomeSection
          title="Test Section"
          isLoading={false}
          isEmpty
          renderSkeleton={mockSkeleton}
        >
          {mockChildren}
        </PerpsHomeSection>,
      );

      expect(queryByText('Test Section')).toBeNull();
    });

    it('shows section when not empty regardless of showWhenEmpty', () => {
      const { getByText } = render(
        <PerpsHomeSection
          title="Test Section"
          isLoading={false}
          isEmpty={false}
          showWhenEmpty={false}
          renderSkeleton={mockSkeleton}
        >
          {mockChildren}
        </PerpsHomeSection>,
      );

      expect(getByText('Test Section')).toBeTruthy();
    });

    it('shows section when loading even if empty', () => {
      const { getByText } = render(
        <PerpsHomeSection
          title="Test Section"
          isLoading
          isEmpty
          showWhenEmpty={false}
          renderSkeleton={mockSkeleton}
        >
          {mockChildren}
        </PerpsHomeSection>,
      );

      expect(getByText('Test Section')).toBeTruthy();
    });
  });

  describe('action button', () => {
    it('renders action button when actionLabel and onActionPress provided', () => {
      const { getByText } = render(
        <PerpsHomeSection
          title="Test Section"
          isLoading={false}
          isEmpty={false}
          actionLabel="Close All"
          onActionPress={jest.fn()}
          renderSkeleton={mockSkeleton}
        >
          {mockChildren}
        </PerpsHomeSection>,
      );

      expect(getByText('Close All')).toBeTruthy();
    });

    it('calls onActionPress when action button is pressed', () => {
      const mockOnActionPress = jest.fn();

      const { getByText } = render(
        <PerpsHomeSection
          title="Test Section"
          isLoading={false}
          isEmpty={false}
          actionLabel="Close All"
          onActionPress={mockOnActionPress}
          renderSkeleton={mockSkeleton}
        >
          {mockChildren}
        </PerpsHomeSection>,
      );

      fireEvent.press(getByText('Close All'));

      expect(mockOnActionPress).toHaveBeenCalledTimes(1);
    });

    it('omits action button when actionLabel not provided', () => {
      const { queryByText } = render(
        <PerpsHomeSection
          title="Test Section"
          isLoading={false}
          isEmpty={false}
          onActionPress={jest.fn()}
          renderSkeleton={mockSkeleton}
        >
          {mockChildren}
        </PerpsHomeSection>,
      );

      expect(queryByText('Close All')).toBeNull();
    });

    it('omits action button when onActionPress not provided', () => {
      const { queryByText } = render(
        <PerpsHomeSection
          title="Test Section"
          isLoading={false}
          isEmpty={false}
          actionLabel="Close All"
          renderSkeleton={mockSkeleton}
        >
          {mockChildren}
        </PerpsHomeSection>,
      );

      expect(queryByText('Close All')).toBeNull();
    });

    it('hides action button when loading', () => {
      const { queryByText } = render(
        <PerpsHomeSection
          title="Test Section"
          isLoading
          isEmpty={false}
          actionLabel="Close All"
          onActionPress={jest.fn()}
          renderSkeleton={mockSkeleton}
        >
          {mockChildren}
        </PerpsHomeSection>,
      );

      expect(queryByText('Close All')).toBeNull();
    });

    it('hides action button when empty', () => {
      const { queryByText } = render(
        <PerpsHomeSection
          title="Test Section"
          isLoading={false}
          isEmpty
          showWhenEmpty
          actionLabel="Close All"
          onActionPress={jest.fn()}
          renderSkeleton={mockSkeleton}
        >
          {mockChildren}
        </PerpsHomeSection>,
      );

      expect(queryByText('Close All')).toBeNull();
    });
  });

  describe('loading states', () => {
    it('shows skeleton during loading state', () => {
      const { getByTestId } = render(
        <PerpsHomeSection
          title="Test Section"
          isLoading
          isEmpty={false}
          renderSkeleton={mockSkeleton}
        >
          {mockChildren}
        </PerpsHomeSection>,
      );

      expect(getByTestId('skeleton-loader')).toBeTruthy();
    });

    it('transitions from loading to content', () => {
      const { getByTestId, queryByTestId, rerender } = render(
        <PerpsHomeSection
          title="Test Section"
          isLoading
          isEmpty={false}
          renderSkeleton={mockSkeleton}
        >
          {mockChildren}
        </PerpsHomeSection>,
      );

      expect(getByTestId('skeleton-loader')).toBeTruthy();
      expect(queryByTestId('section-content')).toBeNull();

      rerender(
        <PerpsHomeSection
          title="Test Section"
          isLoading={false}
          isEmpty={false}
          renderSkeleton={mockSkeleton}
        >
          {mockChildren}
        </PerpsHomeSection>,
      );

      expect(queryByTestId('skeleton-loader')).toBeNull();
      expect(getByTestId('section-content')).toBeTruthy();
    });

    it('calls renderSkeleton function when loading', () => {
      const mockRenderSkeleton = jest.fn(() => (
        <View testID="custom-skeleton" />
      ));

      const { getByTestId } = render(
        <PerpsHomeSection
          title="Test Section"
          isLoading
          isEmpty={false}
          renderSkeleton={mockRenderSkeleton}
        >
          {mockChildren}
        </PerpsHomeSection>,
      );

      expect(mockRenderSkeleton).toHaveBeenCalledTimes(1);
      expect(getByTestId('custom-skeleton')).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('handles empty string title', () => {
      const { queryByText } = render(
        <PerpsHomeSection
          title=""
          isLoading={false}
          isEmpty={false}
          renderSkeleton={mockSkeleton}
        >
          {mockChildren}
        </PerpsHomeSection>,
      );

      expect(queryByText('')).toBeTruthy();
    });

    it('handles complex children', () => {
      const complexChildren = (
        <>
          <View testID="child-1" />
          <View testID="child-2" />
          <Text testID="child-3">Text</Text>
        </>
      );

      const { getByTestId } = render(
        <PerpsHomeSection
          title="Test Section"
          isLoading={false}
          isEmpty={false}
          renderSkeleton={mockSkeleton}
        >
          {complexChildren}
        </PerpsHomeSection>,
      );

      expect(getByTestId('child-1')).toBeTruthy();
      expect(getByTestId('child-2')).toBeTruthy();
      expect(getByTestId('child-3')).toBeTruthy();
    });

    it('handles multiple action button presses', () => {
      const mockOnActionPress = jest.fn();

      const { getByText } = render(
        <PerpsHomeSection
          title="Test Section"
          isLoading={false}
          isEmpty={false}
          actionLabel="Close All"
          onActionPress={mockOnActionPress}
          renderSkeleton={mockSkeleton}
        >
          {mockChildren}
        </PerpsHomeSection>,
      );

      const actionButton = getByText('Close All');

      fireEvent.press(actionButton);
      fireEvent.press(actionButton);
      fireEvent.press(actionButton);

      expect(mockOnActionPress).toHaveBeenCalledTimes(3);
    });
  });

  describe('combined states', () => {
    it('handles loading and showWhenEmpty together', () => {
      const { getByText, getByTestId } = render(
        <PerpsHomeSection
          title="Test Section"
          isLoading
          isEmpty
          showWhenEmpty
          renderSkeleton={mockSkeleton}
        >
          {mockChildren}
        </PerpsHomeSection>,
      );

      expect(getByText('Test Section')).toBeTruthy();
      expect(getByTestId('skeleton-loader')).toBeTruthy();
    });

    it('handles loading with action props', () => {
      const { getByText, queryByText } = render(
        <PerpsHomeSection
          title="Test Section"
          isLoading
          isEmpty={false}
          actionLabel="Close All"
          onActionPress={jest.fn()}
          renderSkeleton={mockSkeleton}
        >
          {mockChildren}
        </PerpsHomeSection>,
      );

      expect(getByText('Test Section')).toBeTruthy();
      expect(queryByText('Close All')).toBeNull();
    });
  });
});
