import React from 'react';
import { render } from '@testing-library/react-native';
import { View, FlexAlignType } from 'react-native';

import Skeleton from './Skeleton';

// Mock animations to prevent Jest environment errors
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock animation timers
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

// Type to replace 'any' for style objects
interface StyleObject {
  [key: string]: string | number | undefined;
}

const customStyles = {
  alignStart: {
    alignSelf: 'flex-start' as FlexAlignType,
  },
};

// Helper function to safely check for opacity style
const findOpacityStyle = (styles: StyleObject) => {
  if (!styles) return undefined;
  if (!Array.isArray(styles)) {
    return 'opacity' in styles ? styles : undefined;
  }
  return styles.find(
    (style) => style && typeof style === 'object' && 'opacity' in style,
  );
};

describe('Skeleton', () => {
  it('should render Skeleton without error', () => {
    const { getByTestId } = render(<Skeleton testID="skeleton" />);
    expect(getByTestId('skeleton')).toBeDefined();
  });

  it('should match snapshot', () => {
    const { toJSON } = render(<Skeleton />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render with custom alignSelf style', () => {
    const { getByTestId } = render(
      <Skeleton testID="skeleton" style={customStyles.alignStart} />,
    );
    const skeletonElement = getByTestId('skeleton');
    expect(skeletonElement.props.style[0].alignSelf).toBe('flex-start');
  });

  it('should render with explicit height and width', () => {
    const { getByTestId } = render(
      <Skeleton testID="skeleton" height={100} width={200} />,
    );
    const skeletonElement = getByTestId('skeleton');
    expect(skeletonElement.props.style[0].height).toBe(100);
    expect(skeletonElement.props.style[0].width).toBe(200);
  });

  it('should render with string dimensions', () => {
    const { getByTestId } = render(
      <Skeleton testID="skeleton" height="50%" width="100%" />,
    );
    const skeletonElement = getByTestId('skeleton');
    expect(skeletonElement.props.style[0].height).toBe('50%');
    expect(skeletonElement.props.style[0].width).toBe('100%');
  });

  it('should render with children', () => {
    const childTestId = 'child-component';
    const childrenWrapperId = 'children-wrapper';

    const { getByTestId } = render(
      <Skeleton childrenWrapperProps={{ testID: childrenWrapperId }}>
        <View testID={childTestId} />
      </Skeleton>,
    );

    expect(getByTestId(childTestId)).toBeDefined();
    expect(getByTestId(childrenWrapperId)).toBeDefined();
  });

  it('should hide children when hideChildren is true', () => {
    const childTestId = 'child-component';
    const childrenWrapperId = 'children-wrapper';

    const { getByTestId } = render(
      <Skeleton
        testID="skeleton-parent"
        hideChildren
        childrenWrapperProps={{ testID: childrenWrapperId }}
      >
        <View testID={childTestId} />
      </Skeleton>,
    );

    // Check that the child is rendered
    const childElement = getByTestId(childTestId);
    expect(childElement).toBeDefined();

    // Directly get the children wrapper using its testID
    const childrenWrapper = getByTestId(childrenWrapperId);
    expect(childrenWrapper).toBeDefined();

    // Check that the opacity is 0 in the style array
    const childWrapperStyles = childrenWrapper.props.style;
    const opacityStyle = findOpacityStyle(childWrapperStyles);
    expect(opacityStyle).toBeDefined();
    expect(opacityStyle?.opacity).toBe(0);
  });

  it('should display children normally when hideChildren is false', () => {
    const childTestId = 'child-component';
    const childrenWrapperId = 'children-wrapper';

    const { getByTestId } = render(
      <Skeleton
        testID="skeleton-parent"
        childrenWrapperProps={{ testID: childrenWrapperId }}
      >
        <View testID={childTestId} />
      </Skeleton>,
    );

    // Check that the child is rendered
    const childElement = getByTestId(childTestId);
    expect(childElement).toBeDefined();

    // Directly get the children wrapper using its testID
    const childrenWrapper = getByTestId(childrenWrapperId);
    expect(childrenWrapper).toBeDefined();

    // Check that the wrapper does not have opacity: 0
    const childWrapperStyles = childrenWrapper.props.style;

    // Use our safe helper to check for opacity
    const opacityStyle = findOpacityStyle(childWrapperStyles);

    // If opacity style exists, ensure it's not 0
    if (opacityStyle) {
      expect(opacityStyle.opacity).not.toBe(0);
    } else {
      // If no opacity style is found, that's also acceptable
      expect(opacityStyle).toBeUndefined();
    }
  });

  it('should animate when no children are present', () => {
    const animatedBackgroundId = 'animated-background';

    const { getByTestId } = render(
      <Skeleton
        testID="skeleton"
        animatedViewProps={{ testID: animatedBackgroundId }}
      />,
    );

    const skeletonElement = getByTestId('skeleton');
    expect(skeletonElement).toBeDefined();

    // Check that the animated background is present
    const animatedBackground = getByTestId(animatedBackgroundId);
    expect(animatedBackground).toBeDefined();
  });

  it('should animate when children are hidden', () => {
    const childTestId = 'child-component';
    const childrenWrapperId = 'children-wrapper';
    const animatedBackgroundId = 'animated-background';

    const { getByTestId } = render(
      <Skeleton
        testID="skeleton"
        hideChildren
        childrenWrapperProps={{ testID: childrenWrapperId }}
        animatedViewProps={{ testID: animatedBackgroundId }}
      >
        <View testID={childTestId} />
      </Skeleton>,
    );

    // Check for animated background
    const animatedBackground = getByTestId(animatedBackgroundId);
    expect(animatedBackground).toBeDefined();

    // Check that child is present but hidden
    const childElement = getByTestId(childTestId);
    expect(childElement).toBeDefined();

    // Check children wrapper has opacity 0
    const childrenWrapper = getByTestId(childrenWrapperId);
    const childWrapperStyles = childrenWrapper.props.style;
    const opacityStyle = findOpacityStyle(childWrapperStyles);
    expect(opacityStyle?.opacity).toBe(0);
  });
});
