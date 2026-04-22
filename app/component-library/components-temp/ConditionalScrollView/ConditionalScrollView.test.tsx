import React from 'react';
import { render } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import ConditionalScrollView from './ConditionalScrollView';

describe('ConditionalScrollView', () => {
  const testContent = (
    <View>
      <Text>Test Content</Text>
    </View>
  );

  describe('when isScrollEnabled is true', () => {
    it('wraps children in ScrollView and renders content', () => {
      const { getByTestId, getByText } = render(
        <ConditionalScrollView
          isScrollEnabled
          scrollViewProps={{ testID: 'scroll-container' }}
        >
          {testContent}
        </ConditionalScrollView>,
      );

      expect(getByTestId('scroll-container')).toBeDefined();
      expect(getByText('Test Content')).toBeDefined();
    });

    it('passes scrollViewProps to ScrollView', () => {
      const testID = 'test-scroll-view';
      const { getByTestId } = render(
        <ConditionalScrollView
          isScrollEnabled
          scrollViewProps={{
            testID,
            showsVerticalScrollIndicator: false,
            bounces: false,
          }}
        >
          {testContent}
        </ConditionalScrollView>,
      );

      const scrollView = getByTestId(testID);
      expect(scrollView.props.showsVerticalScrollIndicator).toBe(false);
      expect(scrollView.props.bounces).toBe(false);
    });
  });

  describe('when isScrollEnabled is false', () => {
    it('renders children without ScrollView wrapper', () => {
      const { getByText, queryByTestId } = render(
        <ConditionalScrollView
          isScrollEnabled={false}
          scrollViewProps={{ testID: 'should-not-exist' }}
        >
          {testContent}
        </ConditionalScrollView>,
      );

      expect(queryByTestId('should-not-exist')).toBeNull();
      expect(getByText('Test Content')).toBeDefined();
    });
  });

  describe('dynamic behavior', () => {
    it('switches between ScrollView and direct rendering when isScrollEnabled changes', () => {
      const result = render(
        <ConditionalScrollView
          isScrollEnabled
          scrollViewProps={{ testID: 'scroll-view' }}
        >
          {testContent}
        </ConditionalScrollView>,
      );

      expect(result.getByTestId('scroll-view')).toBeDefined();

      result.rerender(
        <ConditionalScrollView
          isScrollEnabled={false}
          scrollViewProps={{ testID: 'scroll-view' }}
        >
          {testContent}
        </ConditionalScrollView>,
      );

      expect(result.queryByTestId('scroll-view')).toBeNull();

      result.rerender(
        <ConditionalScrollView
          isScrollEnabled
          scrollViewProps={{ testID: 'scroll-view' }}
        >
          {testContent}
        </ConditionalScrollView>,
      );

      expect(result.getByTestId('scroll-view')).toBeDefined();
    });
  });
});
