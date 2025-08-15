import React from 'react';
import { Text, View } from 'react-native';
import { render } from '@testing-library/react-native';
import { useIsFocused } from '@react-navigation/native';
import UnmountOnBlur from './';

// Mock the useIsFocused hook
jest.mock('@react-navigation/native', () => ({
  useIsFocused: jest.fn(),
}));

const mockUseIsFocused = useIsFocused as jest.MockedFunction<
  typeof useIsFocused
>;

describe('UnmountOnBlur', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when screen is focused', () => {
    beforeEach(() => {
      mockUseIsFocused.mockReturnValue(true);
    });

    it('renders children when focused', () => {
      const { getByText } = render(
        <UnmountOnBlur>
          <Text>Test Content</Text>
        </UnmountOnBlur>,
      );

      expect(getByText('Test Content')).toBeTruthy();
    });

    it('renders complex children when focused', () => {
      const { getByTestId, getByText } = render(
        <UnmountOnBlur>
          <View testID="test-container">
            <Text>Complex Content</Text>
            <Text>Multiple Children</Text>
          </View>
        </UnmountOnBlur>,
      );

      expect(getByTestId('test-container')).toBeTruthy();
      expect(getByText('Complex Content')).toBeTruthy();
      expect(getByText('Multiple Children')).toBeTruthy();
    });
  });

  describe('when screen is not focused', () => {
    beforeEach(() => {
      mockUseIsFocused.mockReturnValue(false);
    });

    it('does not render children when not focused', () => {
      const { queryByText } = render(
        <UnmountOnBlur>
          <Text>Test Content</Text>
        </UnmountOnBlur>,
      );

      expect(queryByText('Test Content')).toBeNull();
    });

    it('renders fallback component when provided and not focused', () => {
      const { getByText, queryByText } = render(
        <UnmountOnBlur fallback={<Text>Fallback Content</Text>}>
          <Text>Main Content</Text>
        </UnmountOnBlur>,
      );

      expect(queryByText('Main Content')).toBeNull();
      expect(getByText('Fallback Content')).toBeTruthy();
    });

    it('renders nothing when no fallback provided and not focused', () => {
      const { queryByText } = render(
        <UnmountOnBlur>
          <Text>Test Content</Text>
        </UnmountOnBlur>,
      );

      // Verify that children are not rendered
      expect(queryByText('Test Content')).toBeNull();
    });
  });

  describe('focus state changes', () => {
    it('unmounts and remounts children when focus changes', () => {
      mockUseIsFocused.mockReturnValue(true);

      const { getByText, queryByText, rerender } = render(
        <UnmountOnBlur>
          <Text>Dynamic Content</Text>
        </UnmountOnBlur>,
      );

      // Initially focused - children should render
      expect(getByText('Dynamic Content')).toBeTruthy();

      // Change to unfocused
      mockUseIsFocused.mockReturnValue(false);
      rerender(
        <UnmountOnBlur>
          <Text>Dynamic Content</Text>
        </UnmountOnBlur>,
      );

      // Children should be unmounted
      expect(queryByText('Dynamic Content')).toBeNull();

      // Change back to focused
      mockUseIsFocused.mockReturnValue(true);
      rerender(
        <UnmountOnBlur>
          <Text>Dynamic Content</Text>
        </UnmountOnBlur>,
      );

      // Children should be remounted
      expect(getByText('Dynamic Content')).toBeTruthy();
    });
  });
});
