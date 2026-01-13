import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { View, Text } from 'react-native';
import PerpsHomeSection from './PerpsHomeSection';

import { TextColor } from '../../../../../component-library/components/Texts/Text';

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

  describe('pressable header with action icon', () => {
    it('makes header row pressable when onActionPress provided', () => {
      const mockOnActionPress = jest.fn();

      const { getByText } = render(
        <PerpsHomeSection
          title="Test Section"
          isLoading={false}
          isEmpty={false}
          onActionPress={mockOnActionPress}
          renderSkeleton={mockSkeleton}
        >
          {mockChildren}
        </PerpsHomeSection>,
      );

      fireEvent.press(getByText('Test Section'));

      expect(mockOnActionPress).toHaveBeenCalledTimes(1);
    });

    it('header is not pressable when onActionPress not provided', () => {
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

      // Header should render but not be pressable
      expect(getByText('Test Section')).toBeTruthy();
    });

    it('hides action icon when loading', () => {
      const mockOnActionPress = jest.fn();

      const { getByText } = render(
        <PerpsHomeSection
          title="Test Section"
          isLoading
          isEmpty={false}
          onActionPress={mockOnActionPress}
          renderSkeleton={mockSkeleton}
        >
          {mockChildren}
        </PerpsHomeSection>,
      );

      // Header should not be pressable when loading
      fireEvent.press(getByText('Test Section'));
      expect(mockOnActionPress).not.toHaveBeenCalled();
    });

    it('hides action icon when empty', () => {
      const mockOnActionPress = jest.fn();

      const { getByText } = render(
        <PerpsHomeSection
          title="Test Section"
          isLoading={false}
          isEmpty
          showWhenEmpty
          onActionPress={mockOnActionPress}
          renderSkeleton={mockSkeleton}
        >
          {mockChildren}
        </PerpsHomeSection>,
      );

      // Header should not be pressable when empty
      fireEvent.press(getByText('Test Section'));
      expect(mockOnActionPress).not.toHaveBeenCalled();
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

    it('handles multiple header presses', () => {
      const mockOnActionPress = jest.fn();

      const { getByText } = render(
        <PerpsHomeSection
          title="Test Section"
          isLoading={false}
          isEmpty={false}
          onActionPress={mockOnActionPress}
          renderSkeleton={mockSkeleton}
        >
          {mockChildren}
        </PerpsHomeSection>,
      );

      const headerRow = getByText('Test Section');

      fireEvent.press(headerRow);
      fireEvent.press(headerRow);
      fireEvent.press(headerRow);

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

    it('handles loading with action props - header not pressable', () => {
      const mockOnActionPress = jest.fn();

      const { getByText } = render(
        <PerpsHomeSection
          title="Test Section"
          isLoading
          isEmpty={false}
          onActionPress={mockOnActionPress}
          renderSkeleton={mockSkeleton}
        >
          {mockChildren}
        </PerpsHomeSection>,
      );

      expect(getByText('Test Section')).toBeTruthy();
      // Header should not be pressable when loading
      fireEvent.press(getByText('Test Section'));
      expect(mockOnActionPress).not.toHaveBeenCalled();
    });
  });

  describe('subtitle rendering', () => {
    it('renders subtitle when provided', () => {
      const { getByText } = render(
        <PerpsHomeSection
          title="Test Section"
          subtitle="-$18.47 (2.1%) Unrealized P&L"
          isLoading={false}
          isEmpty={false}
          renderSkeleton={mockSkeleton}
        >
          {mockChildren}
        </PerpsHomeSection>,
      );

      expect(getByText('-$18.47 (2.1%) Unrealized P&L')).toBeTruthy();
    });

    it('does not render subtitle when not provided', () => {
      const { queryByText } = render(
        <PerpsHomeSection
          title="Test Section"
          isLoading={false}
          isEmpty={false}
          renderSkeleton={mockSkeleton}
        >
          {mockChildren}
        </PerpsHomeSection>,
      );

      // Should only have the title, no subtitle
      expect(queryByText('Test Section')).toBeTruthy();
    });

    it('renders subtitle with custom color', () => {
      const { getByText } = render(
        <PerpsHomeSection
          title="Test Section"
          subtitle="+$50.00 (5.0%) Unrealized P&L"
          subtitleColor={TextColor.Success}
          isLoading={false}
          isEmpty={false}
          renderSkeleton={mockSkeleton}
        >
          {mockChildren}
        </PerpsHomeSection>,
      );

      expect(getByText('+$50.00 (5.0%) Unrealized P&L')).toBeTruthy();
    });

    it('applies subtitleTestID when provided', () => {
      const { getByTestId } = render(
        <PerpsHomeSection
          title="Test Section"
          subtitle="Test Subtitle"
          subtitleTestID="custom-subtitle-testid"
          isLoading={false}
          isEmpty={false}
          renderSkeleton={mockSkeleton}
        >
          {mockChildren}
        </PerpsHomeSection>,
      );

      expect(getByTestId('custom-subtitle-testid')).toBeTruthy();
    });

    it('renders subtitle alongside title and action button', () => {
      const mockOnActionPress = jest.fn();

      const { getByText } = render(
        <PerpsHomeSection
          title="Positions"
          subtitle="-$18.47 (2.1%)"
          subtitleColor={TextColor.Error}
          isLoading={false}
          isEmpty={false}
          onActionPress={mockOnActionPress}
          renderSkeleton={mockSkeleton}
        >
          {mockChildren}
        </PerpsHomeSection>,
      );

      expect(getByText('Positions')).toBeTruthy();
      expect(getByText('-$18.47 (2.1%)')).toBeTruthy();

      // Action should still work
      fireEvent.press(getByText('Positions'));
      expect(mockOnActionPress).toHaveBeenCalledTimes(1);
    });

    it('renders subtitle with suffix', () => {
      const { getByTestId } = render(
        <PerpsHomeSection
          title="Positions"
          subtitle="-$18.47 (2.1%)"
          subtitleColor={TextColor.Error}
          subtitleSuffix="Unrealized PnL"
          subtitleTestID="test-subtitle"
          isLoading={false}
          isEmpty={false}
          renderSkeleton={mockSkeleton}
        >
          {mockChildren}
        </PerpsHomeSection>,
      );

      // Verify both subtitle and suffix are rendered via testIDs
      expect(getByTestId('test-subtitle')).toBeTruthy();
      expect(getByTestId('test-subtitle-suffix')).toBeTruthy();
    });

    it('does not render suffix when subtitle is not provided', () => {
      const { queryByTestId } = render(
        <PerpsHomeSection
          title="Positions"
          subtitleSuffix="Unrealized PnL"
          subtitleTestID="test-subtitle"
          isLoading={false}
          isEmpty={false}
          renderSkeleton={mockSkeleton}
        >
          {mockChildren}
        </PerpsHomeSection>,
      );

      // Suffix should not render without a subtitle
      expect(queryByTestId('test-subtitle')).toBeNull();
      expect(queryByTestId('test-subtitle-suffix')).toBeNull();
    });
  });
});
