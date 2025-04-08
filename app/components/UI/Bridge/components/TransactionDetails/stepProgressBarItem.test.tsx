import React from 'react';
import { View } from 'react-native';
import { render } from '@testing-library/react-native';
import StepProgressBarItem from './stepProgressBarItem';
import { StatusTypes } from '@metamask/bridge-status-controller';

describe('StepProgressBarItem', () => {
  it('should render with minimal props', () => {
    const { getByTestId } = render(
      <StepProgressBarItem
        stepStatus={StatusTypes.UNKNOWN}
        isLastItem={false}
        isEdgeComplete={false}
      >
        <View testID="test-children">Test Content</View>
      </StepProgressBarItem>
    );

    expect(getByTestId('test-children')).toBeTruthy();
  });

  it('should render with PENDING status', () => {
    const { getByTestId } = render(
      <StepProgressBarItem
        stepStatus={StatusTypes.PENDING}
        isLastItem={false}
        isEdgeComplete={false}
      >
        <View testID="test-children">Test Content</View>
      </StepProgressBarItem>
    );

    expect(getByTestId('test-children')).toBeTruthy();
  });

  it('should render with COMPLETE status', () => {
    const { getByTestId } = render(
      <StepProgressBarItem
        stepStatus={StatusTypes.COMPLETE}
        isLastItem={false}
        isEdgeComplete={false}
      >
        <View testID="test-children">Test Content</View>
      </StepProgressBarItem>
    );

    expect(getByTestId('test-children')).toBeTruthy();
  });

  it('should not render vertical line when isLastItem is true', () => {
    const { queryByTestId } = render(
      <StepProgressBarItem
        stepStatus={StatusTypes.UNKNOWN}
        isLastItem={true}
        isEdgeComplete={false}
      >
        <View testID="test-children">Test Content</View>
      </StepProgressBarItem>
    );

    // The vertical line is rendered with a View component, so we can check for its presence
    const verticalLine = queryByTestId('vertical-line');
    expect(verticalLine).toBeNull();
  });

  it('should render with isEdgeComplete true', () => {
    const { getByTestId } = render(
      <StepProgressBarItem
        stepStatus={StatusTypes.UNKNOWN}
        isLastItem={false}
        isEdgeComplete={true}
      >
        <View testID="test-children">Test Content</View>
      </StepProgressBarItem>
    );

    expect(getByTestId('test-children')).toBeTruthy();
  });
});
