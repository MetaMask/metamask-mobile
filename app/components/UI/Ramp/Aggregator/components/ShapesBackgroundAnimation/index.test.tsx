import React from 'react';
import { render } from '@testing-library/react-native';
import ShapesBackgroundAnimation from './';

describe('ShapesBackgroundAnimation', () => {
  it('should render correctly with default props', () => {
    const { getByTestId } = render(
      <ShapesBackgroundAnimation width={200} height={200} />,
    );
    const animationWrapper = getByTestId('shapes-background-animation');
    expect(animationWrapper).toBeDefined();
  });

  it('should render correctly with custom dimensions', () => {
    const { getByTestId } = render(
      <ShapesBackgroundAnimation width={300} height={300} />,
    );
    const animationWrapper = getByTestId('shapes-background-animation');
    expect(animationWrapper).toBeDefined();
  });
});
